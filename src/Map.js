import { useEffect, useMemo, useState } from "react";
import ReactMapGL, {
  Layer,
  Marker,
  Source,
  WebMercatorViewport,
} from "react-map-gl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlagCheckered,
  faMapMarkerAlt,
} from "@fortawesome/free-solid-svg-icons";
import bbox from "@turf/bbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require("worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker").default;

function activityToGeoJson(activity) {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: activity.points.points.map((point) => [
        point.longitude,
        point.latitude,
      ]),
    },
  };
}

export default function Map({ activity }) {
  const [viewport, setViewport] = useState({});
  const activityGeoJson = useMemo(() => activityToGeoJson(activity), [
    activity,
  ]);
  const points = activity.points.points;

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => fitMapToActivity(), [activity]);

  function fitMapToActivity() {
    if (viewport.width) {
      const [minLng, minLat, maxLng, maxLat] = bbox(activityGeoJson);
      const newViewport = new WebMercatorViewport(viewport).fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: 40,
        }
      );
      setViewport(newViewport);
    }
  }

  return (
    <ReactMapGL
      {...viewport}
      mapStyle="mapbox://styles/mapbox/outdoors-v11"
      width="100%"
      height="500px"
      onLoad={fitMapToActivity}
      onViewportChange={(viewport) => setViewport(viewport)}
    >
      <Source id="activity" type="geojson" data={activityGeoJson}>
        <Layer
          id="activity"
          type="line"
          paint={{
            "line-color": "#4385f5",
            "line-width": 3,
          }}
        />
      </Source>
      <Marker longitude={points[0].longitude} latitude={points[0].latitude}>
        <FontAwesomeIcon icon={faMapMarkerAlt} />
      </Marker>
      <Marker
        longitude={points[points.length - 1].longitude}
        latitude={points[points.length - 1].latitude}
      >
        <FontAwesomeIcon icon={faFlagCheckered} />
      </Marker>
    </ReactMapGL>
  );
}
