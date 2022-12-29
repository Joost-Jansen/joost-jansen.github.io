// @ts-check
{
    var margin = {top: 10, right: 50, bottom: 45, left: 20}
    const Y_MIN = 5;  // minimum y axis value

    var histogramSvgElement = d3.select("#histogramSvg");
    
    let getHistogramWidth = () => getWidth(histogramSvgElement) - margin.left - margin.right;
    let getHistogramHeight = () => getHeight(histogramSvgElement) - margin.top - margin.bottom;

    var svg = d3.select("#histogramSvg")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    var palette = {
        grey: "#e1e1e1",
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

    d3.csv('data/GVP_Eruption_Results.csv').then((data) => {

        /**
         * xScale with slider
         */
        var xScale = d3.scaleTime()
            .domain([new Date(1900, 0, 0), new Date()])
            .range([0, getHistogramWidth()]);

        slider = d3.sliderBottom(xScale)
            .step(10)
            .tickFormat(prettyYearsTickFormat)
            .displayFormat(d => prettyYearsTickFormat(d3.timeYear.round(d)))
            .ticks(10)
            .default([new Date(1950, 0, 0), new Date(2000, 0, 0)])
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

        var pan = d3.zoom()
            .translateExtent([[-Infinity, Infinity], [getHistogramWidth() + margin.left + margin.right, Infinity]])
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
                .thresholds(d3.scaleTime().domain(domain).ticks(300));
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

            // Rescale x and move bars
            x = event.transform.rescaleX(xScale);
            bars.selectAll("rect")
                .attr("transform", d => `translate(${x(d.x0)},${yScale(d.length)})`)
                .attr("height", d => getHistogramHeight() - yScale(d.length))
                .attr("width", d => x(d.x1) - x(d.x0));

            // Compute the new selection
            var newSelection = [x.invert(from), x.invert(to)];

            // Change the domain of the xAxis/slider and select the new selection
            slider.domain(x.domain()).value(newSelection);
            g.call(slider);
        }

        /**
         * Colour the currently selected bars
         */
        function highlightSelection() {
            var [from, to] = slider.value();
            bars.selectAll("rect")
                .attr('fill', d => (from <= d.x1 && d.x0 <= to) ? palette.red : palette.grey);
        }

        // Called every time the slider is adjusted
        function onSliderAdjust() {
            var [from, to] = slider.value();
            selectedVolcanoNumbersHistogram = [...new Set(data
                .filter(d => from <= toDate(d) && toDate(d) <= to)
                .map(d => d["Volcano Number"]))]
            onTimeAdjustEvents.forEach(e => e());
            highlightSelection();
        }


        function setSelection(from, to) {
            console.log(from)
            x = xScale.copy()
            x.domain([new Date(from.getFullYear() - 10, 0, 0), new Date(to.getFullYear()+10, 0, 0)])
            slider.domain(x.domain())
            slider.value([from, to])
            g.call(slider)
            drawHistogram()
        }

        drawHistogram();

        // This thingy listens to all zoom / pan events
        svg.append("rect")
            .attr("width", getHistogramWidth())
            .attr("height", getHistogramHeight())
            .style("fill", "#00000000")
            .style("pointer-event", "all")
            .call(pan)
            .on("dblclick.zoom", null);
    });

    /**
     * Convert data point to Date object
     * 
     * @param {*} data a GVP_Eruption_Results data point
     * @returns the corresponding Date object
     */
    function toDate(data) {

        // Month is zero indexed (January is month 0)
        var date = new Date(0, +data["Start Month"]-1, +data["Start Day"]);

        // The Date constructor maps years 0-99 to 1900-1999 (!)
        // This method does the correct thing
        date.setFullYear(+data["Start Year"]);
        return date
    }
};
