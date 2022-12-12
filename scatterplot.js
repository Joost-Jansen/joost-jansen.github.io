
var margin = {top: 20, right: 100, bottom: 50, left: 70},
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#scatterplot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

//Read the data
d3.csv('data/GVP_Volcano_List.csv', function(dataNull) {

    var data = dataNull.filter(function(d)
    {

        if( d["Last_Eruption_Year"] != "Unknown")
        {
            return d;
        }

    })
    // List of groups (here I have one group per column)
    var allGroup = ["Population_within_5_km", "Population_within_10_km", "Population_within_30_km", "Population_within_100_km"]
    var prettyNames = d3.scaleOrdinal(["5km", "10km", "30km" , "100km"], allGroup)

    // Reformat the data: we need an array of arrays of {x, y} tuples
    var dataReady = allGroup.map( function(grpName) { // .map allows to do something for each element of the list
        return {
            name: grpName,
            values: data.map(function(d) {
                return {Last_Eruption_Year: d.Last_Eruption_Year, value: +d[grpName]};
            })
        };
    });
    // I strongly advise to have a look to dataReady with
    console.log(dataReady)

    // A color scale: one color for each group
    var myColor = d3.scaleOrdinal(d3.schemeCategory10, allGroup);

    // ?
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var x = d3.scaleLinear()
        .domain([0,2023])
        .range([0, width]);

    var y = d3.scaleLinear()
        .domain( [0,50000000])
        .range([height, 0]);

    var xAxis = d3.axisBottom(x).ticks(12),
        yAxis = d3.axisLeft(y).ticks(12 * height / width);

    var brush = d3.brush().extent([[0, 0], [width, height]]).on("end", brushended),
        idleTimeout,
        idleDelay = 350;

    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width )
        .attr("height", height )
        .attr("x", 0)
        .attr("y", 0);

    // var xExtent = d3.extent(dataReady, function (d) { return d.Last_Eruption_Year; });
    // var yExtent = d3.extent(dataReady, function (d) { return d.value; });
    // x.domain(d3.extent(dataReady, function (d) { return d.Last_Eruption_Year; })).nice();
    // y.domain(d3.extent(dataReady, function (d) { return d.value; })).nice();

    var scatter = svg.append("g")
        .attr("id", "scatterplot")
        .attr("clip-path", "url(#clip)");

    // Add the points
    scatter
        // First we need to enter in a group
        .selectAll("myDots")
        .data(dataReady)
        .enter()
        .append('g')
        .style("fill", function(d){ return myColor(d.name) })
        .attr("class", function(d){ return d.name })
        // Second we need to enter in the 'values' part of this group
        .selectAll("myPoints")
        .data(function(d){ return d.values })
        .enter()
        .append("circle")
        .attr("cx", function(d) { return x(d.Last_Eruption_Year) } )
        .attr("cy", function(d) { return y(d.value) } )
        .attr("r", 3)
        .attr("stroke", "white")

    // Add a legend (interactive)
    svg
        .selectAll("myLegend")
        .data(dataReady)
        .enter()
        .append('g')
        .append("text")
        .attr('x', function(d,i){ return  i*50})
        .attr('y', height + 40)
        .text(function(d) { return prettyNames(d.name); })
        .style("fill", function(d){ return myColor(d.name) })
        .style("font-size", 15)
        .on("click", function (d) {
                // is the element currently visible ?
                currentOpacity = d3.selectAll("." + d.name).style("opacity")
                currentOpacityText = d3.select(this).style("opacity");
                // Change the opacity: from 0 to 1 or from 1 to 0

                d3.selectAll("." + d.name).transition().style("opacity", currentOpacity == 1 ? 0.1 : 1)
                d3.select(this).transition().style("opacity", currentOpacityText == 1 ? 0.25 : 1)

            })
        .on("mouseover", function (d){
        d3.select(this).transition().style("cursor", "pointer")
    })

    // Add x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr('id', "axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Add x-label
    svg.append("text")
        .style("text-anchor", "end")
        .attr("x", width)
        .attr("y", height+30)
        .text("Last eruption year");

    // Add y-axis
    svg.append("g")
        .attr("class", "y axis")
        .attr('id', "axis--y")
        .call(yAxis);

    // Add y-label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("dy", "1em")
        .style("text-anchor", "end")
        .text("Population");

    // Add titel
    svg.append("text")
        .style("text-anchor", "end")
        .style("font-family", "fantasy")
        .attr("x", width / 1.5)
        .attr("y",  2)
        .text("Population compared to last eruption year");

    // Add zoom
    scatter.append("g")
        .attr("class", "brush")
        .call(brush);

    function brushended() {

        var s = d3.event.selection;
        if (!s) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
            x.domain([0,2023])
            y.domain([0,50000000])
        } else {

            x.domain([s[0][0], s[1][0]].map(x.invert, x));
            y.domain([s[1][1], s[0][1]].map(y.invert, y));
            scatter.select(".brush").call(brush.move, null);
        }
        zoom();
    }

    function idled() {
        idleTimeout = null;
    }

    function zoom() {

        var t = scatter.transition().duration(750);
        svg.select("#axis--x").transition(t).call(xAxis);
        svg.select("#axis--y").transition(t).call(yAxis);
        scatter.selectAll("circle").transition(t)
            .attr("cx", function (d) { return x(d.Last_Eruption_Year); })
            .attr("cy", function (d) { return y(d.value); });
    }
})