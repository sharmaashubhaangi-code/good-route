import { useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Polyline,
    CircleMarker,
    Popup,
    Marker
} from 'react-leaflet';
import L from 'leaflet';
import Routecard from './Routecard';
import 'leaflet/dist/leaflet.css';
import './App.css';

const startIcon = L.divIcon({
    className: "start-marker",
    html: "📍",
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const endIcon = L.divIcon({
    className: "end-marker",
    html: "🏁",
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

function RouteMap({ routes }) {

    if (!routes || routes.length === 0) {
        return null;
    }

    const validRoutes = routes.filter(
        route =>
            route.geometry &&
            route.geometry.coordinates &&
            route.geometry.coordinates.length > 0
    );

    if (validRoutes.length === 0) {
        return null;
    }

    const allCoordinates = [];

    validRoutes.forEach(route => {
        route.geometry.coordinates.forEach(point => {
            allCoordinates.push([point[1], point[0]]);
        });
    });

    const startPoint = allCoordinates[0];
    const endPoint = allCoordinates[allCoordinates.length - 1];

    const routeColors = [
        "#7b4b84",
        "#c56b8b"
    ];

    const minLat = Math.min(
        ...allCoordinates.map(point => point[0])
    );

    const maxLat = Math.max(
        ...allCoordinates.map(point => point[0])
    );

    const minLng = Math.min(
        ...allCoordinates.map(point => point[1])
    );

    const maxLng = Math.max(
        ...allCoordinates.map(point => point[1])
    );

    const center = [
        (minLat + maxLat) / 2,
        (minLng + maxLng) / 2
    ];

    return (
        <div
            style={{
                width: "100%",
                height: "450px",
                margin: "25px 0 20px",
                borderRadius: "18px",
                overflow: "hidden",
                border: "1px solid #decfe0"
            }}
        >

            <MapContainer
                center={center}
                zoom={10}
                style={{
                    width: "100%",
                    height: "100%"
                }}
                scrollWheelZoom={true}
            >

                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validRoutes.map((route, index) => {

                    const positions =
                        route.geometry.coordinates.map(point => [
                            point[1],
                            point[0]
                        ]);

                    return (
                        <Polyline
                            key={route.name}
                            positions={positions}
                            pathOptions={{
                                color: routeColors[index % routeColors.length],
                                weight: 7,
                                opacity: 0.9
                            }}
                        />
                    );
                })}

                <Marker
                    position={startPoint}
                    icon={startIcon}
                >
                    <Popup>
                        Starting location
                    </Popup>
                </Marker>

                <Marker
                    position={endPoint}
                    icon={endIcon}
                >
                    <Popup>
                        Destination
                    </Popup>
                </Marker>

                {validRoutes.map(route => {

                    if (
                        !route.nearbyReports ||
                        route.nearbyReports.length === 0
                    ) {
                        return null;
                    }

                    return route.nearbyReports.map(report => {

                        if (
                            typeof report.latitude !== "number" ||
                            typeof report.longitude !== "number"
                        ) {
                            return null;
                        }

                        return (
                            <CircleMarker
                                key={`${route.name}-${report.id}`}
                                center={[
                                    report.latitude,
                                    report.longitude
                                ]}
                                radius={8}
                                pathOptions={{
                                    color: "#b85c68",
                                    fillColor: "#e17b8a",
                                    fillOpacity: 0.9
                                }}
                            >
                                <Popup>
                                    <strong>
                                        {report.problem}
                                    </strong>
                                    <br />
                                    {report.location}
                                    <br />
                                    {report.description}
                                </Popup>
                            </CircleMarker>
                        );
                    });
                })}

            </MapContainer>

        </div>
    );
}

function Searchbox() {

    const [start, setStart] = useState("");
    const [destination, setDestination] = useState("");

    const [routes, setRoutes] = useState([]);

    const [showRoutes, setShowRoutes] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [location, setLocation] = useState("");
    const [problem, setProblem] = useState("");
    const [description, setDescription] = useState("");
    const [reportMessage, setReportMessage] = useState("");

    const findRoute = () => {

        if (!start || !destination) {
            setError(
                "Please enter both starting location and destination."
            );
            return;
        }

        setError("");
        setMessage("");
        setRoutes([]);
        setShowRoutes(false);
        setLoading(true);

        fetch(
            `http://127.0.0.1:5000/route?start=${encodeURIComponent(start)}&destination=${encodeURIComponent(destination)}`
        )
            .then(response => {

                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(
                            data.message || "Could not find a route"
                        );
                    });
                }

                return response.json();
            })
            .then(data => {

                setRoutes(data);
                setShowRoutes(true);

                setMessage(
                    `${data.length} route option(s) found.`
                );
            })
            .catch(error => {

                console.log(
                    "Error finding route:",
                    error
                );

                setError(
                    error.message ||
                    "Could not find a route."
                );
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const submitReport = () => {

        if (!location || !problem || !description) {
            setReportMessage(
                "Please fill all the fields."
            );
            return;
        }

        const newReport = {
            location: location,
            problem: problem,
            description: description
        };

        fetch(
            "http://127.0.0.1:5000/reports",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(newReport)
            }
        )
            .then(response => {

                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(
                            data.message ||
                            "Could not save report"
                        );
                    });
                }

                return response.json();
            })
            .then(() => {

                setReportMessage(
                    "Report submitted successfully!"
                );

                setLocation("");
                setProblem("");
                setDescription("");

            })
            .catch(error => {

                setReportMessage(
                    error.message ||
                    "Could not submit report."
                );
            });
    };

    return (
        <div className="search-page">

            <div className="search-card">

                <div className="hero-text">

                    <h1>
                        Find a better route
                    </h1>

                    <p>
                        Compare routes using real road-condition reports.
                    </p>

                </div>

                <div className="input-group">

                    <label>
                        Starting location
                    </label>

                    <input
                        type="text"
                        placeholder="e.g. Indore"
                        value={start}
                        onChange={(e) =>
                            setStart(e.target.value)
                        }
                    />

                </div>

                <div className="input-group">

                    <label>
                        Destination
                    </label>

                    <input
                        type="text"
                        placeholder="e.g. Bhopal"
                        value={destination}
                        onChange={(e) =>
                            setDestination(e.target.value)
                        }
                    />

                </div>

                <div className="main-buttons">

                    <button
                        className="primary-button"
                        onClick={findRoute}
                        disabled={loading}
                    >
                        {loading
                            ? "Finding routes..."
                            : "Find Route"}
                    </button>

                    <button
                        className="secondary-button"
                        onClick={() => {
                            setShowReportForm(!showReportForm);
                            setReportMessage("");
                        }}
                    >
                        Report a Road Problem
                    </button>

                </div>

                {message && (
                    <p className="success-message">
                        {message}
                    </p>
                )}

                {error && (
                    <p className="error-message">
                        {error}
                    </p>
                )}

            </div>

            {showReportForm && (

                <div className="report-form">

                    <h2>
                        Report a Road Problem
                    </h2>

                    <p>
                        Help other travellers by reporting road conditions.
                    </p>

                    <input
                        type="text"
                        placeholder="Specific road or location"
                        value={location}
                        onChange={(e) =>
                            setLocation(e.target.value)
                        }
                    />

                    <select
                        value={problem}
                        onChange={(e) =>
                            setProblem(e.target.value)
                        }
                    >

                        <option value="">
                            Select Problem
                        </option>

                        <option value="Potholes">
                            Potholes
                        </option>

                        <option value="Waterlogging">
                            Waterlogging
                        </option>

                        <option value="Mud/Unpaved Road">
                            Mud / Unpaved Road
                        </option>

                        <option value="Construction">
                            Construction
                        </option>

                        <option value="Poor lighting">
                            Poor Lighting
                        </option>

                    </select>

                    <textarea
                        placeholder="Describe the problem"
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                    />

                    <button
                        className="primary-button"
                        onClick={submitReport}
                    >
                        Submit Report
                    </button>

                    {reportMessage && (
                        <p className="success-message">
                            {reportMessage}
                        </p>
                    )}

                </div>
            )}

            {showRoutes && (

                <div className="results-section">

                    <div className="section-heading">

                        <h2>
                            Your Routes
                        </h2>

                        <p>
                            See where each route actually goes.
                        </p>

                    </div>

                    <RouteMap routes={routes} />

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "30px",
                            margin: "-5px 0 25px"
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontWeight: "600",
                                color: "#633b69"
                            }}
                        >

                            <span
                                style={{
                                    width: "35px",
                                    height: "6px",
                                    background: "#7b4b84",
                                    borderRadius: "10px",
                                    display: "inline-block"
                                }}
                            ></span>

                            Route 1

                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontWeight: "600",
                                color: "#633b69"
                            }}
                        >

                            <span
                                style={{
                                    width: "35px",
                                    height: "6px",
                                    background: "#c56b8b",
                                    borderRadius: "10px",
                                    display: "inline-block"
                                }}
                            ></span>

                            Route 2

                        </div>

                    </div>

                    <div className="routes-grid">

                        {routes.map((route, index) => (

                            <Routecard
                                key={index}
                                index={index}
                                name={route.name}
                                distance={`${route.distance} km`}
                                time={`${Math.floor(route.duration / 60)} hr ${route.duration % 60} min`}
                                nearbyReports={route.nearbyReports || []}
                                roadInfo={route.roadInfo || {}}
                            />

                        ))}

                    </div>

                </div>
            )}

        </div>
    );
}

export default Searchbox;