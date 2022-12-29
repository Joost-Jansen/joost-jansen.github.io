// interface for map.js
let volcanoes = undefined;
let scatter =  undefined
let isVolcanoInsideRegion = c => undefined;
let onRegionAdjustEvents = [];
let onMapReadyEvents = [];
let volcanoIconSize = undefined;
let volcanoIconSizeHover = undefined;
let highlightMapVolcano = v => undefined;
let removeHighlightMapVolcano = v => undefined;

// interface for histogram.js
let onTimeAdjustEvents = [];
let slider = undefined;
let selectedVolcanoNumbersHistogram = []
let drawHistogram = v => undefined;

// interface for scatter.js
const scatterCircleSize = 4
const scatterCircleSizeHover = 8
let resizeScatterPoint = (sp, size) => undefined;

// util
let getWidth = el => parseInt(el.node().clientWidth);
let getHeight = el => parseInt(el.node().clientHeight);
let scatterVolcanoIndex = {};



// ################################
// ### TOOLTIP AND HIGHLIGHTING ###
// ################################

// only set up tooltip and highlighting when both the scatter and the map are done loading
let scatterReady = false;
let mapReady = false;
let selectedType = 'All'

function setMapReady() {
    mapReady = true;
    if (scatterReady) setupSelectionTypeTooltipAndHighlighting();
}

function setScatterReady() {
    scatterReady = true;
    if (mapReady) setupSelectionTypeTooltipAndHighlighting();
}

function getSelectionType(d){
    return (selectedType == 'All'  || d.Volcano_Type == selectedType);
}

function setupSelectionTypeTooltipAndHighlighting() {

    let buttonTypes = ['All', 'Caldera', 'Cone', 'Shield', 'Stratovolcano', 'Submarine', 'Other']
    // add the options to the button
    d3.select("#typeButton")
        .selectAll('myOptionsType')
        .data(buttonTypes)
        .enter()
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; }) // corresponding value returned by the button

    d3.select("#typeButton").on("change", function(d) {
        selectedType = d3.select("#typeButton").property("value");
        changeOpacityOnRegionSelect()
        volcanoes.selectAll("circle").transition().duration(100).style("display", function (d) {
            return (getSelectionType(d) ? 'block' : 'none')
        } )
        drawHistogram()
    })


    // make indices for quickly referencing volcanoes in both the scatterplot and the map
    let mapVolcanoIndex = {}
    volcanoes.selectAll("circle")
        .each((d, i, circles) => {
            let v = d3.select(circles[i]);
            mapVolcanoIndex[d.Volcano_Number] = v;
        });

    scatterVolcanoIndex = {}
    scatter.selectAll("circle")
        .each((d, i, circles) => {
            let sp = d3.select(circles[i]);
            if (scatterVolcanoIndex[d.Volcano_Number] != undefined)
                scatterVolcanoIndex[d.Volcano_Number].push(sp);
            else
                scatterVolcanoIndex[d.Volcano_Number] = [sp];
        });


    let tooltip = d3.select("#tooltip");

    // add tooltip and highlight functionality to volcanoes in the map
    volcanoes.selectAll("circle")
        .on("mouseenter", onMouseEnter)
        .on("mousemove", showTooltip)
        .on("mouseleave", onMouseLeave);
    
    // add tooltip and highlight functionality to volcanoes in the scatter plot
    scatter.selectAll("circle")
        .on("mouseenter", onMouseEnter)
        .on("mousemove", showTooltip)
        .on("mouseleave", onMouseLeave);

    function onMouseEnter(_, d) {
        let v = mapVolcanoIndex[d.Volcano_Number];
        let sps = scatterVolcanoIndex[d.Volcano_Number];
        if (v != undefined) highlightMapVolcano(v);
        if (sps != undefined) sps.forEach(sp => resizeScatterPoint(sp, scatterCircleSizeHover));
    }

    function onMouseLeave(e, d) {
        let v = mapVolcanoIndex[d.Volcano_Number];
        let sps = scatterVolcanoIndex[d.Volcano_Number];
        if (v != undefined) removeHighlightMapVolcano(v);
        if (sps != undefined) sps.forEach(sp => resizeScatterPoint(sp, scatterCircleSize));
        
        hideTooltip(e, d);
    }

    function showTooltip(e, d) {
        d3.select("#tooltipVolcanoName").text(d.Volcano_Name);
        d3.select("#tooltipVolcanoType").text(d.Primary_Volcano_Type);
        d3.select("#tooltipLastEruptionYear").text(d.Last_Eruption_Year);
        d3.select("#tooltipPopulation").text(d.Population_within_100_km);

        tooltip
            .style("display",  "block")
            .style("left", (e.pageX - getWidth(tooltip) - 10) + "px")
            .style("top", (e.pageY) + "px");
    }

    function hideTooltip() {
        tooltip.style("display", "none");
    }
}