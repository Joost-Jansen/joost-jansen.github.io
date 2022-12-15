// @ts-check
{
  const dataPath = "../data/";
  const mapWidth = 1200;
  const mapHeight = 800;
  const mapZoomfactor = 0.0002;
  let mapZoom = 150;
  let mapTranslateX = 0;
  let mapTranslateY = 0;
  const volcanoIconSize = 8;
  let eruptionTimeRange = [0, 200];
  const volcanoEruptedColor = "red";
  const volcanoNotEruptedColor = "black";

  let mapSvg = d3.select('#worldMap')
    .append("svg")
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .attr("id", "mapSvg");

  let countries = mapSvg.append("g")
    .attr("id", "countries");
  let volcanoes = mapSvg.append("g")
    .attr("id", "volcanoes");

  let projection = d3.geoMercator()
    .center([2, 47]) // GPS of location to zoom on
    .scale(mapZoom)
    .translate([ mapWidth / 2, mapHeight / 2 ]);

  // populate svg with countries using the loaded geoData
  d3.json(dataPath + "custom.geo.json").then(function(geoData) {
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
  d3.csv(dataPath + "GVP_Volcano_List.csv").then(function(volcanoData) {
      volcanoes.selectAll("circle")
        .data(volcanoData)
        .enter()
        .append("circle")
          .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
          .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
          .attr("r", volcanoIconSize);
        
      setupTooltip();
  });

  // map update function for when projection changes
  function updateMapView() {
    projection
      .scale(mapZoom)
      .translate([mapWidth / 2 + mapTranslateX * mapZoom, mapHeight / 2 + mapTranslateY * mapZoom]);
    
    countries.selectAll("path")
      .attr("d", d3.geoPath()
        .projection(projection)
      );
    
    volcanoes.selectAll("circle")
    .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
    .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
  }

  // map update function for when eruption time range changes (defined below)
  let updateTimeRange = () => undefined;

  d3.csv(dataPath + "GVP_Volcano_List.csv").then(function(volcanoData) {
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

      updateTimeRange = () => {
        volcanoes.selectAll("circle")
          .style("fill", d => {
            let eruptions = volcanoEruptionIndex[d.Volcano_Number];
            
            let inRange = eruptions.some(eruptionId => {
              let eruption = eruptionIndex[eruptionId];
              
              return parseFloat(eruption["Start Year"]) >= eruptionTimeRange[0] 
                && parseFloat(eruption["Start Year"]) <= eruptionTimeRange[1]
            });

            return inRange ? volcanoEruptedColor : volcanoNotEruptedColor;
          });
      };

      updateTimeRange();
    })
  });

  // set up zoom input
  mapSvg.on("wheel", (e) => {
    mapZoom = mapZoom ** (1 - e.deltaY * mapZoomfactor);
    updateMapView();
    return false;
  });

  // set up mouse drag input
  mapSvg.on("mousemove", (e) => {
    if (e.buttons == 1) { // check if left-button is held
      mapTranslateX += e.movementX / mapZoom;
      mapTranslateY += e.movementY / mapZoom;
      updateMapView();
    }
  });
  
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
}
