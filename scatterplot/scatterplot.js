// @ts-check
{
    const scatterMargin = {top: 20, right: 10, bottom: 50, left: 65}
    const scatterWidth = 450 - scatterMargin.left - scatterMargin.right
    const scatterHeight = 300 - scatterMargin.top - scatterMargin.bottom;
    // A color scale: one color for each group
    let myColor = d3.scaleOrdinal(d3.schemeCategory10);
    const circleSize = 3
    const circleSizeHover = 5

// append the svg object to the body of the page
    let scatterSvg = d3.select("#scatterplot")
        .append("svg")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + scatterMargin.left + "," + scatterMargin.top + ")");

    // hover at plot
    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    let x = d3.scaleLinear()
        .domain([0, 2023])
        .range([0, scatterWidth]);

    let y = d3.scaleLinear()
        .domain([0, 50000000])
        .range([scatterHeight, 0]);

    let xAxis = d3.axisBottom(x).ticks(12),
        yAxis = d3.axisLeft(y).ticks(12 * scatterHeight / scatterWidth);

    let scatterClip = scatterSvg.append("defs").append("svg:clipPath")
        .attr("id", "clip2")
        .append("svg:rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .attr("x", 0)
        .attr("y", 0);
    // Add x-axis
    scatterSvg.append("g")
        .attr("class", "x axis")
        .attr('id', "axis--x")
        .attr("transform", "translate(0," + scatterHeight + ")")
        .call(xAxis);

    // Add x-label
    scatterSvg.append("text")
        .style("text-anchor", "end")
        .attr("x", scatterWidth)
        .attr("y", scatterHeight + 30)
        .text("Last eruption year");

    // Add y-axis
    scatterSvg.append("g")
        .attr("class", "y axis")
        .attr('id', "axis--y")
        .call(yAxis);

    // Add y-label
    scatterSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("dy", "1em")
        .style("text-anchor", "end")
        .text("Population");

    // Add titel
    scatterSvg.append("text")
        .style("text-anchor", "end")
        .style("font-family", "fantasy")
        .attr("x", scatterWidth - 50)
        .attr("y", 2)
        .text("Population compared to last eruption year");

    scatter = scatterSvg.append("g")
        .attr("id", "scatterplot")
        .attr("clip-path", "url(#clip2)");

//Read the data
    let dataCSV = d3.csv('data/GVP_Volcano_List.csv')

    dataCSV.then(function (data) {

        // List of groups (here I have one group per column)
        var allGroupTypes = ['Shield', 'Stratovolcano', 'Caldera', 'Submarine', 'Fissure vent', 'Complex',
            'Cone', 'Volcanic field', 'Dome', 'Compound', 'Maar', 'Crater', 'Ring', 'Subglacial']
        var allGroupPopulation = ["Population_within_5_km", "Population_within_10_km", "Population_within_30_km", "Population_within_100_km"]
        var prettyNamesPopulation = d3.scaleOrdinal(["5km", "10km", "30km", "100km"])

        // Reformat the data: we need an array of arrays of {x, y} tuples
        var dataReady = allGroupPopulation.map(function (grpName) { // .map allows to do something for each element of the list
            return {
                name: grpName,
                values: data.map(function (d) {
                    return {
                        Volcano_Number: d.Volcano_Number,
                        Volcano_Name: d.Volcano_Name,
                        Country: d.Country,
                        Primary_Volcano_Type: d.Primary_Volcano_Type,
                        Last_Eruption_Year: +d.Last_Eruption_Year,
                        value: +d[grpName],
                    };
                })
            };
        });

        var brush = d3.brush().extent([[0, 0], [scatterWidth, scatterHeight]]).on("end", function (e) {
                brushended(e)
            }),
            idleTimeout,
            idleDelay = 350;

        // Add zoom
        scatter.append("g")
            .attr("class", "brush")
            .call(brush);

        // Add the points
        scatter
            // First we need to enter in a group
            .selectAll("myDots")
            .data(dataReady)
            .enter()
            .append('g')
            .style("fill", function (d) {
                return myColor(d.name)
            })
            .attr("class", function (d) {
                return d.name
            })
            // Second we need to enter in the 'values' part of this group
            .selectAll("myPoints")
            .data(function (d) {
                return d.values
            })
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return x(d.Last_Eruption_Year)
            })
            .attr("cy", function (d) {
                return y(d.value)
            })
            .attr("r", 3)
            .attr("stroke", "white")
            .attr("pointer-events", "all")
            // to color on volcano type
            // .style("fill", function(d){ return myColor2(d.Primary_Volcano_Type) })
            .on('mouseover', function (e, d) {
                // Changes cursor
                d3.select(this).transition().style("cursor", "pointer")
                // Changes size of circle
                d3.select("#scatterplot").selectAll("circle")
                    .filter(function (dot) {
                        return (dot.Volcano_Number == d.Volcano_Number)
                    })
                    .transition()
                    .duration('100')
                    .attr("r", circleSizeHover);

                volcanoes.selectAll("circle")
                    .filter(function (dot) {
                        return (dot.Volcano_Number == d.Volcano_Number)
                    })
                    .transition()
                    .duration('100')
                    .attr("r", 20)

                // hover tooltip
                updateTooltip(e, d, tooltip)
            })
            .on('mouseout', function (e, d, i) {
                // Changes size of circle back
                d3.select("#scatterplot").selectAll("circle")
                    .filter(function (dot) {
                        return (dot.Volcano_Number == d.Volcano_Number)
                    }).transition()
                    .duration('200')
                    .attr("r", circleSize);


                volcanoes.selectAll("circle")
                    .filter(function (dot) {
                        return (dot.Volcano_Number == d.Volcano_Number)
                    })
                    .transition()
                    .duration('100')
                    .attr("r", volcanoIconSize);

                updateTooltip(e, d, tooltip)
            });

        // Add a legend (interactive)
        scatterSvg
            .selectAll("myLegend")
            .data(dataReady)
            .enter()
            .append('g')
            .append("text")
            .attr('x', function (d, i) {
                return i * 50
            })
            .attr('y', scatterHeight + 40)
            .text(function (d) {
                return prettyNamesPopulation(d.name);
            })
            .style("fill", function (d) {
                return myColor(d.name)
            })
            .style("font-size", 15)
            .on("click", function (e, d) {
                // is the element currently visible ?
                currentOpacity = d3.selectAll("." + d.name).style("opacity")
                currentOpacityText = d3.select(this).style("opacity");
                // Change the opacity: from 0 to 1 or from 1 to 0

                d3.selectAll("." + d.name).transition().style("opacity", currentOpacity == 1 ? 0.1 : 1)
                d3.select(this).transition().style("opacity", currentOpacityText == 1 ? 0.25 : 1)

            })
            .on("mouseover", function (e, d) {
                d3.select(this).transition().style("cursor", "pointer")
            })

        // set up functionality of "zoom out" button
        let zoomButton = d3.select('#zoomOutButton')
            .on("click", (e) => {
                brushended(null)
                brushended(null)
            });

        function brushended(e) {
            if (!e || !e.selection) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
                x.domain([0, 2023])
                y.domain([0, 50000000])
            } else {
                var s = e.selection
                x.domain([s[0][0], s[1][0]].map(x.invert, x));
                y.domain([s[1][1], s[0][1]].map(y.invert, y));
                scatter.select(".brush").call(brush.move, null);
            }
            zoom(e);
        }

        function idled() {
            idleTimeout = null;
        }

        function zoom(e) {

            var t = scatter.transition().duration(750);
            scatterSvg.select("#axis--x").transition().call(xAxis);
            scatterSvg.select("#axis--y").transition().call(yAxis);
            scatter.selectAll("circle").transition(t)
                .attr("cx", function (d) {
                    return x(d.Last_Eruption_Year);
                })
                .attr("cy", function (d) {
                    return y(d.value);
                });
        }

        function updateTooltip(e, d, tooltip){
            if (tooltip.style("opacity") == 0){
                tooltip.transition()
                    .duration(100)
                    .style("opacity", 1);
                tooltip.html("Volcano Name: " + d.Volcano_Name + "<br>" +
                    "Volcano Type: " + d.Primary_Volcano_Type + "<br>" +
                    "Eruption Year: " + d.Last_Eruption_Year + "<br>" +
                    "Population: " + d3.format(",")(d.value))
                    .style("left", (e.pageX + 10) + "px")
                    .style("top", (e.pageY) + "px");

            } else{
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0);
            }
        }
    })
};