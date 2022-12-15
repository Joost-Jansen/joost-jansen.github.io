// @ts-check
{
  let dataPath = "../data/";
  let mapWidth = 1200;
  let mapHeight = 800;
  let mapZoom = 150;
  let mapZoomfactor = 0.0002;
  let mapTranslateX = 0;
  let mapTranslateY = 0;

  let mapSvg = d3.select('#world-map')
    .append("svg")
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .attr("style", "cursor:move; border: 2px; border-style: solid; margin: -2px;");

  let projection = d3.geoMercator()
    .center([2, 47]) // GPS of location to zoom on
    .scale(mapZoom)  // This is like the zoom
    .translate([ mapWidth / 2, mapHeight / 2 ]);

  d3.json(dataPath + "custom.geo.json").then(function(geoData) {
    console.log("hi");

    // init map svg using the loaded data
    mapSvg.append("g")
      .selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("fill", "#d8d8d8")
      .attr("d", d3.geoPath()
          .projection(projection)
      )
      .style("stroke", "#606060");

    // map update function for when projection changes
    function updateMap() {
      projection
        .scale(mapZoom)
        .translate([mapWidth / 2 + mapTranslateX * mapZoom, mapHeight / 2 + mapTranslateY * mapZoom]);
      
      mapSvg.select("g")
        .selectAll("path")
        .attr("d", d3.geoPath()
          .projection(projection)
        );
    }

    // set up zoom input
    mapSvg.node().onwheel = (e) => {
      mapZoom = mapZoom ** (1 - e.deltaY * mapZoomfactor);
      updateMap();
      return false;
    };

    // set up mouse drag input
    mapSvg.node().addEventListener("mousemove", (e) => {
      if (e.buttons == 1) { // check if left-button is held
        mapTranslateX += e.movementX / mapZoom;
        mapTranslateY += e.movementY / mapZoom;
        updateMap();
      }
    });
  });

  // let volcanoes = ... [use example]
}

  // let mapWidth = 1200;
  // let mapHeight = 800;
  // let mapZoom = 150;
  // let mapZoomfactor = 0.0002;
  // let mapTranslateX = 0;
  // let mapTranslateY = 0.8;

  // let canvas = d3.select('#world-map')
  //   .append("canvas")
  //   .attr("width", mapWidth)
  //   .attr("height", mapHeight)
  //   .attr("style", "cursor:move; border: 2px; border-style: solid; margin: -2px;")
  //   .node();
  // let context = canvas.getContext('2d');

  // let projection = d3.geoMercator()
  //   .scale(mapZoom)
  //   .translate([mapTranslateX, mapTranslateY]);

  // let geoGenerator = d3.geoPath(projection, context);

  // let volcanoesSvg = d3.select("#world-map")
  //   .append("svg")
  //   .attr("width", mapWidth)
  //   .attr("height", mapHeight)
  //   .attr("id", "volcano-svg");

  // // general update function for the world map
  // function updateMap() {
  //   projection
  //     .scale(mapZoom)
  //     .translate([canvas.width / 2 + mapTranslateX * mapZoom, 
  //       canvas.height / 2 + mapTranslateY * mapZoom]);
    
  //   context.clearRect(0, 0, canvas.width, canvas.height);
    
  //   context.lineWidth = 2;
  //   context.strokeStyle = '#000000';
  //   context.fillStyle = "#ccc";
    
  //   context.beginPath();
  //   geoGenerator(geojson);
  //   context.fill();
  //   context.stroke();

  //   d3.csv(dataPath + 'GVP_Volcano_List.csv', function (volcanoData) {
  //     let volcanoLoc = projection([parseFloat(volcanoData.Latitude), 
  //       parseFloat(volcanoData.Longitude)]);
  //     volcanoesSvg
  //       .append("circle")
  //       .data(volcanoLoc)
  //       .attr("cx", volcanoLoc[0])
  //       .attr("cy", volcanoLoc[1])
  //       .attr("r", 10);
  //   });
  // }

  // // set up zoom input
  // canvas.onwheel = (e) => {
  //   mapZoom = mapZoom ** (1 - e.deltaY * mapZoomfactor);
  //   updateMap();
  //   return false;
  // };

  // // set up mouse drag input
  // canvas.addEventListener("mousemove", (e) => {
  //   if (e.buttons == 1) { // check if left-button is held
  //     mapTranslateX += e.movementX / mapZoom;
  //     mapTranslateY += e.movementY / mapZoom;
  //     updateMap();
  //   }
  // });

  // // initial update
  // updateMap();

// d3.json(dataPath + 'custom.geo.json');

// fetch(dataPath + 'custom.geo.json').then((response) => {
//   response.json().then((geoData) => {
//     drawMap(geoData);
//   });
// });