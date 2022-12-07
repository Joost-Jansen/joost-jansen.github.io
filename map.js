// @ts-check

function drawMap(geojson) {

  let mapZoom = 90;
  let mapZoomfactor = 0.0002;
  let mapTranslateX = 0;
  let mapTranslateY = 0.8;

  let canvas = d3.select('canvas').node();
  let context = canvas.getContext('2d');

  let projection = d3.geoMercator()
    .scale(mapZoom)
    .translate([mapTranslateX, mapTranslateY]);

  let geoGenerator = d3.geoPath(projection, context);

  function update(geojson, zoom, translateX, translateY) {
    projection
      .scale(zoom)
      .translate([canvas.width / 2 + translateX * zoom, 
        canvas.height / 2 + translateY * zoom]);
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context.lineWidth = 2;
    context.strokeStyle = '#000000';
    context.fillStyle = "#ccc";
    
    context.beginPath();
    geoGenerator(geojson);
    context.fill();
    context.stroke();
  }

  canvas.onwheel = (e) => {
    mapZoom = mapZoom ** (1 - e.deltaY * mapZoomfactor);

    update(geojson, mapZoom, mapTranslateX, mapTranslateY);
  };

  canvas.addEventListener("mousemove", (e) => {
    if (e.buttons == 1) { // check if left-button is held
      mapTranslateX += e.movementX / mapZoom;
      mapTranslateY += e.movementY / mapZoom;

      update(geojson, mapZoom, mapTranslateX, mapTranslateY);
    }
  });

  update(geojson, mapZoom, mapTranslateX, mapTranslateY);
}


fetch('/data/custom.geo.json').then((response) => {
  response.json().then((data) => {
    drawMap(data);
  })
});