// @ts-check
{
    var margin = {top: 20, right: 50, bottom: 40, left: 20}
    const Y_MIN = 5;  // minimum y axis value
    const X_TICKS = 50; // x axis resolution (markers snap to these values)

    var histogramSvgElement = d3.select("#histogramSvg");
    
    let getHistogramWidth = () => getWidth(histogramSvgElement) - margin.left - margin.right;
    let getHistogramHeight = () => getHeight(histogramSvgElement) - margin.top - margin.bottom;

    var svg = d3.select("#histogramSvg")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    var palette = {
        grey: "#e1e1e1",
        darkGrey: "#777777",
        red: "#e03030",
    };

    /**
     * Pretty years tick format
     * 
     * Identical to the default time tick format, except
     * for years. This format displays:
     *  79 instead of 0079
     *  10 BCE instead of -0010
     *  10000 BCE instead of -0000 (!)
     * @param {Date} date
     * @returns a pretty formatted date
     */
    function prettyYearsTickFormat(date) {
        var defaultFormat = d3.scaleTime().tickFormat();
        var year = date.getFullYear();
        return ( d3.timeYear(date) < date ? defaultFormat(date)
            : year < 0 ? `${-1 * year} BCE`
            : year
        );
    }

    /**
     * Convert data point to Date object
     * 
     * @param {*} data a GVP_Eruption_Results data point
     * @returns the corresponding Date object
     */
    function toDate(data) {
        // Month is zero indexed (January is month 0)
        return createDate(data["Start Year"], data["Start Month"]-1, data["Start Day"]);
    }
 
    // The Date constructor maps years 0-99 to 1900-1999 (!)
    // This function does the correct thing
    let createDate = (year, month, day) => new Date(new Date(0, month, day).setFullYear(year));


    // Fill months of date picker
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    d3.selectAll(".monthInput")
        .selectAll("months")
        .data(months)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => months.indexOf(d));

    d3.csv('data/GVP_Eruption_Results.csv').then((data) => {
        var to = [d3.select("#toYear"), d3.select("#toMonth"), d3.select("#toDay")]
        var from = [d3.select("#fromYear"), d3.select("#fromMonth"), d3.select("#fromDay")]

        for (let d of [...to, ...from]) {
            d.on("change", d => setSelection(getDate(from), getDate(to)))
        }


        /**
         * xScale with slider
         */
        var xScale = d3.scaleTime()
            .domain([new Date(1900, 0, 1), new Date()])
            .range([0, getHistogramWidth()]);

        slider = d3.sliderBottom(xScale)
            .step(10)
            .tickFormat(prettyYearsTickFormat)
            .displayFormat(d => prettyYearsTickFormat(d3.timeYear.floor(d)))
            .ticks(10)
            .marks(d3.timeTicks(...xScale.domain(), X_TICKS))
            .default([new Date(1950, 0, 1), new Date(2000, 0, 1)])
            .fill(palette.red)
            .on('onchange', onSliderAdjust);

        /**
         * yScale
         */
        var yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([getHistogramHeight(), 0]);
        var yAxis = svg.append("g")
            .attr("transform", `translate(${getHistogramWidth()+15},0)`)
            .call(d3.axisRight(yScale).ticks(5));

        // y axis label
        svg.append("text")
            .attr("id", "yAxisLabel")
            .attr("text-anchor", "end")
            .attr("x", getHistogramWidth() + 35)
            .attr("y", -10)
            .style("fill", palette.darkGrey)
            .text("number of eruptions");


        var zoom = d3.zoom()
            .on("zoom", handlePan)
            .on("end", drawHistogram);

        svg.append("defs").append("SVG:clipPath")
            .attr("id", "clip")
            .append("SVG:rect")
            .attr("width", getHistogramWidth())
            .attr("height", getHistogramHeight())
            .attr("x", 0)
            .attr("y", 0);

        var x = xScale.copy();
        var bars = svg.append("g").attr("clip-path", "url(#clip)");
        var g = svg.append("g").attr("transform", `translate(0,${getHistogramHeight()})`);

        // This thingy listens to all zoom / pan events
        var zoomBox = svg.append("rect")
            .attr("width", getHistogramWidth())
            .attr("height", getHistogramHeight())
            .style("fill", "#00000000")
            .style("pointer-event", "all")
        zoomBox
            .call(zoom)
            .on("dblclick.zoom", null);

        g.call(slider);


        /**
         * Draw the histogram
         */
        function drawHistogram() {

            // Extend domain to enable sideways scrolling
            var domain = [x.invert(-getHistogramWidth()), x.invert(2*getHistogramWidth())];

            // Create histogram
            var hist = d3.histogram()
                .value(toDate)
                .domain(domain)
                .thresholds(d3.scaleTime().domain(domain).ticks(3*X_TICKS));
            var bins = hist(data);

            // Rescale yAxis for new bins
            var yMax = d3.max(bins
                .filter(d => d.x0 > x.invert(0) && d.x1 < x.invert(getHistogramWidth()))
                .map(d => d.length));
            yScale.domain([0, Math.max(Y_MIN, yMax)]);
            yAxis.call(d3.axisRight(yScale).ticks(5)).call(g => g.select('.domain').remove());

            // Remove old bars
            bars.selectAll("rect").remove();

            // Draw bars
            bars.selectAll(".bar")
                .data(bins)
                .enter()
                .append("rect")
                .attr("x", 1)
                .attr("transform", d => `translate(${x(d.x0)},${yScale(d.length)})`)
                .attr("height", d => getHistogramHeight() - yScale(d.length))
                .attr("width", d => x(d.x1) - x(d.x0));

            // Highlight the selected bars
            onSliderAdjust();
        }

        drawHistogram();

        /**
         * Handle panning: update x axis and move slider markers
         */
        function handlePan(event) {

            // Idea: Everything should move except for the selection, which should
            // stay at the same point on the screen

            // Store the current selection
            var selection = slider.value();
            var from = x(selection[0]);
            var to = x(selection[1]);

            // Apply transform
            applyTransform(event.transform);

            // Compute the new selection
            var newSelection = [x.invert(from), x.invert(to)];
            setSliderValue(newSelection);
            g.call(slider);
            highlightSelection();
        }

        /**
         * Colour the currently selected bars
         */
        function highlightSelection() {
            var [from, to] = slider.value();
            bars.selectAll("rect")
                .attr('fill', d => (from <= d.x0 && d.x1 <= to) ? palette.red : palette.grey);
        }

        // Called every time the slider is adjusted
        function onSliderAdjust() {
            var [from, to] = slider.value();

            selectedVolcanoNumbersHistogram = [...new Set(data
                .filter(d => from <= toDate(d) && toDate(d) <= to)
                .map(d => d["Volcano Number"]))]
            onTimeAdjustEvents.forEach(e => e());
            highlightSelection();
            setDateSelectionText(...slider.value());
        }

        /**
         * Apply transform to x axis
         * 
         * This takes care of both the x scale and the axis (slider)
         * @param {*} transform the zoom transform
         */
        function applyTransform(transform) {
            // Rescale x and move bars
            x = transform.rescaleX(xScale);
            bars.selectAll("rect")
                .attr("transform", d => `translate(${x(d.x0)},${yScale(d.length)})`)
                .attr("height", d => getHistogramHeight() - yScale(d.length))
                .attr("width", d => x(d.x1) - x(d.x0));
            // Change the domain of the xAxis/slider and select the new selection
            slider.domain(x.domain());
            slider.marks(d3.timeTicks(...x.domain(), X_TICKS));
        }

        /**
         * Set the slider selection. Does nothing if interval is invalid.
         * 
         * @param {Date} from the start date
         * @param {Date} to the end date
         */
        function setSelection(from, to) {

            // Ignore invalid intervals
            if (to < from) {return; }

            // Idea: compute the zoom transform that corresponds to
            // moving the [from, to] coordinates into view.

            // Current x coordinates of from and to
            var fromCurrent = xScale(from);
            var toCurrent = xScale(to);

            // Target x coordinates of from and to
            var fromTarget = getHistogramWidth() / 5;  // 20% padding from left boundary
            var toTarget = 4 * fromTarget;  // 20% padding from right boundary

            // Math magic
            var m = (fromTarget - toTarget*fromCurrent/toCurrent) / (1 - fromCurrent/toCurrent);
            var k = (toTarget - m) / toCurrent;
            var transform = new d3.ZoomTransform(k, m ,0);

            applyTransform(transform);
            setSliderValue([from, to]);
            g.call(slider);
            drawHistogram();

            // Make sure that the next transform is based on this one
            zoomBox.call(zoom.transform, transform);
        }

        /**
         * Set value of slider, overriding slider marks
         *
         * @param {*} value the new slider value
         */
        function setSliderValue(value){
            slider.marks(null).value(value);
            slider.marks(d3.timeTicks(...x.domain(), X_TICKS));
        }

        /**
         * Create a Date object from a date input field
         *
         * @param {*} field
         * @returns the corresponding Date object
         */
        function getDate(field) {
            return createDate(...field.map(d => d.property("value")));
        }

        /**
         * Set the text of the date input fields
         * 
         * @param {*} fromDate the start date
         * @param {*} toDate the end date
         */
        function setDateSelectionText(fromDate, toDate) {
            fromDate = new Date(fromDate);
            toDate = new Date(toDate);
            
            var [fromYear, fromMonth, fromDay] = from
            fromYear.property("value", fromDate.getFullYear())
            fromMonth.property("value", fromDate.getMonth())
            fromDay.property("value", fromDate.getDate())

            var [toYear, toMonth, toDay] = to
            toYear.property("value", toDate.getFullYear())
            toMonth.property("value", toDate.getMonth())
            toDay.property("value", toDate.getDate())
        }
    });
};
