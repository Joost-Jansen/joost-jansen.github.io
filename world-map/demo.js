// @ts-check

{
  // The global variables from map.js (these might be undefined at start):
  console.log("DEMO CODE RUNNING!");
  console.log("volcanoes:", volcanoes);
  console.log("isVolcanoInsideRegion:", isVolcanoInsideRegion);
  console.log("onRegionAdjustEvents:", onRegionAdjustEvents);
  console.log("onMapReadyEvents:", onMapReadyEvents);


  // define a function to be called on every region adjustement that updates the volcano list
  function update() {

    // create a list of selected volcano names
    let selectedVolcanoNames = [];

    // refill the volcano names array with the updated selection
    volcanoes
      .selectAll("circle")
      .each((d, i, circles) => {
        let c = d3.select(circles[i]);
        if (isVolcanoInsideRegion(c) && selectedVolcanoNumbersHistogram.indexOf(d.Volcano_Number))
          selectedVolcanoNames.push(d.Volcano_Number);
      });
    updateScatterplot(selectedVolcanoNames, [])
}

  function updateScatterplot(selectedVolcanoNames, hoverVolcanoNames){
      scatter.selectAll("circle")
          .transition()
          .duration('100')
          .attr("r", 3)
          .style("opacity", function (dot) {
              return (selectedVolcanoNames.indexOf(dot.Volcano_Number) > 0) ? 1 : 0.1
          });
  }

  // add our function to the list of "region adjust" events (in order to have it be called on each 
  // user adjustment to the region)
  onRegionAdjustEvents.push(update);

  // also add it to the "map ready" events so that it is called once on map load
  onMapReadyEvents.push(update);
}