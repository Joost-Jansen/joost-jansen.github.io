// @ts-check
{
  const dataPath = "../data/";
  const mapZoomfactor = 0.0002;
  let mapZoom = 150;
  let mapTranslateX = 0;
  let mapTranslateY = 0;
  volcanoIconSize = 8;
  const volcanoEruptedColor = "red";
  const volcanoNotEruptedColor = "black";
  let regionSelectMode = true;
  let regionMin = [0, 0];
  let regionMax = [0, 0];

  let mapSvg = d3.select('#mapSvg');

  let getMapWidth = () => getWidth(mapSvg);
  let getMapHeight = () => getHeight(mapSvg);

  let countries = mapSvg.append("g")
    .attr("id", "countries");
  let regionSelection = mapSvg.append("g")
    .attr("id", "regionSelection");
  volcanoes = mapSvg.append("g")
    .attr("id", "volcanoes");

  let projection = d3.geoMercator()
    .center([0, 0]) // GPS of location to zoom on
    .scale(mapZoom)
    .translate([ getMapWidth() / 2, getMapHeight() / 2 ]);
  
  let brush = d3.brush()
    .extent([[-1e5, -1e5], [1e5, 1e5]]);

    
  // #####################################
  // ### MAP GENERATION AND NAVIGATION ###
  // #####################################

  // populate svg with countries using the loaded geoData
  d3.json(dataPath + "countries-110m.json").then(function(topoData) {

    // @ts-ignore
    let geoData = topojson.feature(topoData, topoData.objects.countries);

    countries.selectAll("path") // @ts-ignore
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("fill", "#d8d8d8")
      .attr("d", d3.geoPath()
          .projection(projection)
      )
      .style("stroke", "#606060");
  });

  // populate svg with volcanoes
  d3.csv(dataPath + "GVP_Volcano_List_old.csv").then(function(volcanoData) {
      volcanoes.selectAll("circle")
        .data(volcanoData)
        .enter()
        .append("circle")
          .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
          .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
          .attr("r", volcanoIconSize);
      
      // set up tooltip (can only be done after volcanoes are loaded)
      setupTooltip();

      // call onMapReady events
      onMapReadyEvents.forEach(e => e());
  });

  // map update function for when projection changes
  function updateMapView() {
    projection
      .scale(mapZoom)
      .translate([getMapWidth() / 2 + mapTranslateX * mapZoom, getMapHeight() / 2 + mapTranslateY * mapZoom]);
    
    // redraw countries
    countries.selectAll("path")
      .attr("d", d3.geoPath()
        .projection(projection)
      );
    
    // reposition volcanoes
    volcanoes.selectAll("circle")
    .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
    .attr("cy", d => projection([d.Longitude, d.Latitude])[1])

    // reposition region selection
    brush
      .move(regionSelection, [[getMapWidth() / 2 + (regionMin[0] + mapTranslateX) * mapZoom, 
                              getMapHeight() / 2 + (regionMin[1] + mapTranslateY) * mapZoom], 
                             [getMapWidth() / 2 + (regionMax[0] + mapTranslateX) * mapZoom, 
                              getMapHeight() / 2 + (regionMax[1] + mapTranslateY) * mapZoom]])
  }

  // set up zoom input
  mapSvg.on("wheel", (e) => {
    mapZoom = mapZoom ** (1 - e.deltaY * mapZoomfactor);
    updateMapView();
    e.preventDefault();
  });

  // set up mouse drag input
  mapSvg.on("mousemove", (e) => {
    if (e.buttons == 1) { // check if left-button is held
      mapTranslateX += e.movementX / mapZoom;
      mapTranslateY += e.movementY / mapZoom;
      updateMapView();
    }
  }, true);

    
  // ######################################
  // ### MAP UPDATE BASED ON TIME RANGE ###
  // ######################################

  // map update function for when eruption time range changes (defined below)
  let updateTimeRange = (min, max) => undefined;

  d3.csv(dataPath + "GVP_Volcano_List_old.csv").then(function(volcanoData) {
    d3.csv(dataPath + "GVP_Eruption_Results.csv").then(function(eruptionData) {
      
      // set up eruption and volcano-eruption indices for quick lookup
      let eruptionIndex = {};
      let volcanoEruptionIndex = {};

      // fill the volcano-eruption index with empty lists
      volcanoData.forEach(volcano => {
        let volcanoId = volcano.Volcano_Number;
        volcanoEruptionIndex[volcanoId] = [];
      });

      eruptionData.forEach(eruption => {
        let volcanoId = eruption["Volcano Number"];
        let eruptionId = eruption["Eruption Number"];
        
        // include in eruption index
        eruptionIndex[eruptionId] = eruption;

        // include in volcano-eruption index
        if (volcanoEruptionIndex[volcanoId] != undefined)
          volcanoEruptionIndex[volcanoId].push(eruptionId);
      });

      // now that data is prepared, define the time range update function
      updateTimeRange = (min, max) => {
        volcanoes.selectAll("circle")
          .style("fill", d => {
            let eruptions = volcanoEruptionIndex[d.Volcano_Number];
            
            let inRange = eruptions.some(eruptionId => {
              let eruption = eruptionIndex[eruptionId];
              
              return parseFloat(eruption["Start Year"]) >= min 
                && parseFloat(eruption["Start Year"]) <= max
            });

            return inRange ? volcanoEruptedColor : volcanoNotEruptedColor;
          });
      };

      // call the updateTimeRange function once to correctly color the volcanoes
      updateTimeRange(-Infinity, Infinity);
      onTimeAdjustEvents.push(() => {
        let [from, to] = slider.value();
        updateTimeRange(from.getFullYear(), to.getFullYear());
      });
    })
  });
  
    
  // ###############
  // ### TOOLTIP ###
  // ###############

  // add tooltip functionality
  function setupTooltip() {
    
    // create tooltip div
    let tooltip = d3.select("#worldMap")
      .append("div")
      .attr("id", "tooltip");
    
    // add mouse interaction to volcanoes
    volcanoes.selectAll("circle")
      .on("mouseover", () => tooltip.style("opacity", 1))
      .on("mouseleave", () => tooltip.style("opacity", 0))
      .on("mousemove", (e, d) => {
        tooltip.html(d.Volcano_Name + "<br>" + "Longitude: " + d.Longitude + "<br>" + 
                    "Latitude: " + d.Latitude + "<br>Last eruption year: " + d.Last_Eruption_Year)
        .style("left", (e.pageX+10) + "px")
        .style("top", e.pageY + "px");
      });
    }

    
// ########################
// ### REGION SELECTION ###
// ########################

// utility function to check if a volcano circle is inside the selection region
isVolcanoInsideRegion = (c, overrideSelection = null) => {
  let selection = overrideSelection != null 
    ? overrideSelection
    : d3.brushSelection(regionSelection.node());

  return selection == null                                                // if selection is null
    || c.attr("cx") >= selection[0][0] && c.attr("cy") >= selection[0][1] // or circle inside
    && c.attr("cx") <= selection[1][0] && c.attr("cy") <= selection[1][1];
}

// define what happens when the selection region is adjusted by the user
brush.on("brush end", (e) => { if (regionSelectMode) onRegionAdjust(e.selection); });

function onRegionAdjust(selection) {
  
  // Capture zoom-invariant region variables regionMin and regionMax
  regionMin = selection != null
    ? [(selection[0][0] - getMapWidth() / 2) / mapZoom - mapTranslateX, 
        (selection[0][1] - getMapHeight() / 2) / mapZoom - mapTranslateY]
    : [0, 0];
  regionMax = selection != null
    ? [(selection[1][0] - getMapWidth() / 2) / mapZoom - mapTranslateX, 
      (selection[1][1] - getMapHeight() / 2) / mapZoom - mapTranslateY]
    : [0, 0];

  // Adjust circle opacity based on selection
  volcanoes.selectAll("circle")
    .each((_, i, circles) => {
      let c = d3.select(circles[i]); // @ts-ignore
      c.style("fill-opacity", isVolcanoInsideRegion(c, selection) ? 0.5 : 0);
    });
  
  // Call other events
  onRegionAdjustEvents.forEach(e => e());
}

// Call onRegionAdjust once at start up with an empty selection
onRegionAdjust(null);

// attach brush to regionSelection svg and prevent interaction when regionSelectMode == false
regionSelection
  .on("mousedown mousemove mouseover mouseleave", (e) => {
      if (!regionSelectMode) e.stopPropagation();
    }, true)
  .call(brush);

  // set up functionality of "clear region" button
  let clearRegionButton = d3.select('#clearRegionButton')
    .on("click", () => {
      brush.clear(regionSelection);
      onRegionAdjust(null);
    });

  // set up functionality of "select region" button
  function selectRegionButtonOnClick() {
    regionSelectMode = !regionSelectMode;
    regionSelection
      .select(".overlay")
      .style("cursor", regionSelectMode ? "crosshair" : "move");
    
    d3.select('#selectRegionButton')
      .html(regionSelectMode ? "done" : "region select");

    clearRegionButton
      .attr("disabled", regionSelectMode ? true : null);

    volcanoes
      .attr("pointer-events", regionSelectMode ? "none" : "auto");
  }
  
  d3.select('#selectRegionButton')
    .on("click", selectRegionButtonOnClick);
  
  // call this function once at the start (assuming regionSelectMode == true) to set cursors 
  // correctly.
  selectRegionButtonOnClick();
}
