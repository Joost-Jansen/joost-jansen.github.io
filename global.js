// interface for map.js
let volcanoes = undefined;
let scatter =  undefined
let isVolcanoInsideRegion = (c) => undefined;
let onRegionAdjustEvents = [];
let onMapReadyEvents = [];
let volcanoIconSize = undefined;

// interface for histogram.js
let onTimeAdjustEvents = [];
let slider = undefined;

// util functions
let getWidth = (el) => parseInt(el.node().clientWidth);
let getHeight = (el) => parseInt(el.node().clientHeight);