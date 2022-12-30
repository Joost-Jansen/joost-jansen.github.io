// @ts-check
{
    const scatterMargin = {top: 20, right: 10, bottom: 50, left: 65}

    // A color scale: one color for each group
    let myColor = d3.scaleOrdinal(d3.schemeCategory10);

    const xDomainLastEruption = [0,2022]
    const xDomainNumberEruptions = [0,200]
    const yDomainTotal = [0, 50000000]
    const yDomainPerKm = [0, 60000]


    // append the svg object to the body of the page
    let scatterSvgElement = d3.select("#scatterplotSvg")
        
    let getScatterWidth = () => getWidth(scatterSvgElement) - scatterMargin.left - scatterMargin.right;
    let getScatterHeight = () => getHeight(scatterSvgElement) - scatterMargin.top - scatterMargin.bottom;

    let scatterSvg = scatterSvgElement
        .append("g")
        .attr("id", "scatterPoints")
        .attr("transform",
            "translate(" + scatterMargin.left + "," + scatterMargin.top + ")");

    let x = d3.scaleLinear()
        .domain(xDomainLastEruption)
        .range([0, getScatterWidth()]);

    let y = d3.scaleLinear()
        .domain(yDomainTotal)
        .range([getScatterHeight(), 0]);

    let xAxis = d3.axisBottom(x).ticks(10).tickFormat(x => x),
        yAxis = d3.axisLeft(y).ticks(12 * getScatterHeight() / getScatterWidth());

    let scatterClip = scatterSvg.append("defs").append("svg:clipPath")
        .attr("id", "clip2")
        .append("svg:rect")
        .attr("width", getScatterWidth())
        .attr("height", getScatterHeight())
        .attr("x", 0)
        .attr("y", 0);
    
    // Add x-axis
    scatterSvg.append("g")
        .attr("class", "x axis")
        .attr('id', "axis--x")
        .attr("transform", "translate(0," + getScatterHeight() + ")")
        .call(xAxis);

    // Add x-label
    var xAxisText = scatterSvg.append("text")
        .style("text-anchor", "end")
        .attr("x", getScatterWidth())
        .attr("y", getScatterHeight() + 30)
        .text("Last Eruption Year")
        .style("font-size", "11px");

    // Add y-axis
    scatterSvg.append("g")
        .attr("class", "y axis")
        .attr('id', "axis--y")
        .call(yAxis);

    // Add y-label
    var yAxisText = scatterSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("dy", "1em")
        .style("text-anchor", "end")
        .text("Population")
        .style("font-size", "11px");

    // Add title
    var titel = scatterSvg.append("text")
        .attr("class", "scatter title")
        .attr("text-anchor", "middle")
        .attr("x",  getScatterWidth()/2)
        .attr("y", 0 - (margin.top/2))
        .text("Total population compared to last eruption year")
        .style("font-size", "16px")

    scatter = scatterSvg.append("g")
        .attr("id", "scatterplot")
        .attr("clip-path", "url(#clip2)");

//Read the data
    let dataCSV = d3.csv('data/GVP_Volcano_List.csv')

    dataCSV.then(function (data) {

        // List of groups (here I have one group per column)
        var allGroupTypes = ['Shield', 'Stratovolcano', 'Caldera', 'Submarine', 'Fissure vent', 'Complex',
            'Cone', 'Volcanic field', 'Dome', 'Compound', 'Maar', 'Crater', 'Ring', 'Subglacial']
        var allGroupPopulationTotal = ["Population_within_5_km", "Population_within_10_km", "Population_within_30_km", "Population_within_100_km"]
        var nameDictionary = { "Population_within_5_km":"Population_per_km2_within_5_km",
                                        "Population_within_10_km":"Population_per_km2_within_10_km",
                                        "Population_within_30_km":"Population_per_km2_within_30_km",
                                        "Population_within_100_km":"Population_per_km2_within_100_km"}
        var prettyNamesPopulation = d3.scaleOrdinal(["5km", "10km", "30km", "100km"])
        var buttonSelectionX = ["Last eruption year", "Number of eruptions"]
        var buttonSelectionY = ["Total population", "Population per km2"]

        // Reformat the data: we need an array of arrays of {x, y} tuples
        var dataReady = allGroupPopulationTotal.map(function (grpName) { // .map allows to do something for each element of the list
            return {
                name: grpName,
                values: data.map(function (d) {
                    return {
                        Volcano_Number: d.Volcano_Number,
                        Volcano_Name: d.Volcano_Name,
                        Country: d.Country,
                        Primary_Volcano_Type: d.Primary_Volcano_Type,
                        Last_Eruption_Year: +d.Last_Eruption_Year,
                        Number_Of_Eruptions: +d.Number_Of_Erruptions,
                        value: +d[grpName],
                        value2: +d[nameDictionary[grpName]]
                    };
                })
            };
        });

        // add the options to the button
        d3.select("#selectButtonX")
            .selectAll('myOptionsX')
            .data(buttonSelectionX)
            .enter()
            .append('option')
            .text(function (d) { return d; }) // text showed in the menu
            .attr("value", function (d) { return d; }) // corresponding value returned by the button

        d3.select("#selectButtonX").on("change", function(d) {
                // recover the option that has been chosen
                var selectedOptionX = d3.select(this).property("value")
                var selectedOptionY = d3.select("#selectButtonY").property("value")
                updateAxis(selectedOptionX, selectedOptionY)
            })

        // add the options to the button
        d3.select("#selectButtonY")
            .selectAll('myOptionsY')
            .data(buttonSelectionY)
            .enter()
            .append('option')
            .text(function (d) { return d; }) // text showed in the menu
            .attr("value", function (d) { return d; }) // corresponding value returned by the button

        d3.select("#selectButtonY").on("change", function(d) {
                // recover the option that has been chosen
                var selectedOptionX = d3.select("#selectButtonX").property("value")
                var selectedOptionY = d3.select(this).property("value")
                updateAxis(selectedOptionX, selectedOptionY)
            })

        var brush = d3.brush().extent([[0, 0], [getScatterWidth(), getScatterHeight()]]).on("end", function (e) {
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
                return (d3.select("#selectButtonX").property("value") == "Last eruption year") ? x(d.Last_Eruption_Year): x(d.Number_Of_Eruptions) ;
                // return  x(d.Last_Eruption_Year);
            })
            .attr("cy", function (d) {
                return y(d.value)
            })
            .attr("r", scatterCircleSize)
            .attr("pointer-events", "all");

        resizeScatterPoint = (sp, size) => {
            sp.transition()
                .duration(100)
                .attr("r", size);        
        }

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
            .attr('y', getScatterHeight() + 40)
            .text(function (d) {
                return prettyNamesPopulation(d.name);
            })
            .style("fill", function (d) {
                return myColor(d.name)
            })
            .style("font-size", 15)
            .on("click", function (e, d) {
                // is the element currently visible ?
                var currentOpacity = parseFloat(d3.selectAll("." + d.name).style("opacity"));
                var currentOpacityText = parseFloat(d3.select(this).style("opacity"));
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
                var typeX = d3.select("#selectButtonX").property("value")
                var typeY = d3.select("#selectButtonY").property("value")
                x.domain( (typeX == "Last eruption year") ? xDomainLastEruption : xDomainNumberEruptions);
                y.domain((typeY == "Total population") ? yDomainTotal : yDomainPerKm);
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
                    return (d3.select("#selectButtonX").property("value") == "Last eruption year") ? x(d.Last_Eruption_Year) : x(d.Number_Of_Eruptions) ;
                })
                .attr("cy", function (d) {
                    return (d3.select("#selectButtonY").property("value") == "Total population") ? y(d.value) :  y(d.value2);
                });
        }

        function updateAxis(selectionX, selectionY){
            xAxisText.text(selectionX)
            yAxisText.text(selectionY)
            titel.text(selectionY + " compared to "+ selectionX.toLowerCase());
            brushended(null)
            brushended(null)
        }

        setScatterReady();
    });

    function changeOpacityOnRegionSelect(){
        volcanoes
            .selectAll("circle")
            .each((d, i, circles) => {
                let c = d3.select(circles[i]);
                let sps = scatterVolcanoIndex[d.Volcano_Number]
                if (sps != undefined) sps.forEach(sp => {
                    sp.transition()
                        .duration(100)
                        .style("display", _ => {
                            return isVolcanoInsideRegion(c) ? "block" : "none"
                        });
                        
                });
            });
    }

    onRegionAdjustEvents.push(changeOpacityOnRegionSelect);
    onMapReadyEvents.push(changeOpacityOnRegionSelect);
};