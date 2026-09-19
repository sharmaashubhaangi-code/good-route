require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });

const reportSchema = new mongoose.Schema({
    location: String,
    problem: String,
    description: String,
    latitude: Number,
    longitude: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Report = mongoose.model("Report", reportSchema);

const REPORT_RADIUS_KM = 2;

let lastGeocodeRequest = 0;

async function geocode(place) {

    const waitTime = 1100 - (Date.now() - lastGeocodeRequest);

    if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastGeocodeRequest = Date.now();

    const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(place)}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "GoodRoute/1.0"
        }
    });

    if (!response.ok) {
        throw new Error("Location search failed");
    }

    const data = await response.json();

    if (!data.length) {
        throw new Error(`Location not found: ${place}`);
    }

    return {
        latitude: Number(data[0].lat),
        longitude: Number(data[0].lon)
    };
}

function haversineDistance(lat1, lon1, lat2, lon2) {

    const earthRadius = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return earthRadius * c;
}

function findNearestRouteDistance(report, routeGeometry) {

    let minimumDistance = Infinity;

    for (const point of routeGeometry.coordinates) {

        const routeLongitude = point[0];
        const routeLatitude = point[1];

        const distance = haversineDistance(
            report.latitude,
            report.longitude,
            routeLatitude,
            routeLongitude
        );

        if (distance < minimumDistance) {
            minimumDistance = distance;
        }
    }

    return minimumDistance;
}

async function getOSMRoadInfo(routeGeometry) {

    try {

        const coordinates = routeGeometry.coordinates;

        const sampleCount = 12;

        const step = Math.max(
            1,
            Math.floor(coordinates.length / sampleCount)
        );

        const samples = [];

        for (let i = 0; i < coordinates.length; i += step) {

            const [longitude, latitude] = coordinates[i];

            samples.push({
                latitude,
                longitude
            });
        }

        const queryParts = samples.map(point => {
            return `way(around:200,${point.latitude},${point.longitude})["highway"];`;
        });

        const query = `
[out:json][timeout:25];
(
    ${queryParts.join("\n")}
);
out tags;
`;

        const response = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain"
                },
                body: query
            }
        );

        if (!response.ok) {
            throw new Error("OpenStreetMap data request failed");
        }

        const data = await response.json();

        const uniqueWays = new Map();

        data.elements.forEach(element => {

            if (!uniqueWays.has(element.id)) {
                uniqueWays.set(element.id, element);
            }

        });

        const ways = Array.from(uniqueWays.values());

        const surfaces = [];
        const smoothness = [];

        let litYes = 0;
        let litNo = 0;

        ways.forEach(way => {

            const tags = way.tags || {};

            if (tags.surface) {
                surfaces.push(tags.surface);
            }

            if (tags.smoothness) {
                smoothness.push(tags.smoothness);
            }

            if (tags.lit === "yes") {
                litYes++;
            }

            if (tags.lit === "no") {
                litNo++;
            }

        });

        const unpavedSurfaces = [
            "unpaved",
            "gravel",
            "fine_gravel",
            "dirt",
            "earth",
            "mud",
            "sand",
            "ground",
            "grass"
        ];

        const roughSurfaces = [
            "bad",
            "very_bad",
            "horrible",
            "very_horrible",
            "impassable"
        ];

        const unpaved = surfaces.filter(surface =>
            unpavedSurfaces.includes(surface)
        );

        const rough = smoothness.filter(value =>
            roughSurfaces.includes(value)
        );

        return {
            dataAvailable: ways.length > 0,
            surfaces: [...new Set(surfaces)],
            smoothness: [...new Set(smoothness)],
            unpaved: [...new Set(unpaved)],
            rough: [...new Set(rough)],
            litYes,
            litNo
        };

    } catch (error) {

        console.log("OSM road information error:", error);

        return {
            dataAvailable: false,
            surfaces: [],
            smoothness: [],
            unpaved: [],
            rough: [],
            litYes: 0,
            litNo: 0
        };
    }
}

function analyseRoute(route, reports) {

    const nearbyReports = [];

    for (const report of reports) {

        if (
            typeof report.latitude !== "number" ||
            typeof report.longitude !== "number"
        ) {
            continue;
        }

        const distance = findNearestRouteDistance(
            report,
            route.geometry
        );

        if (distance <= REPORT_RADIUS_KM) {

            nearbyReports.push({
                id: report._id,
                location: report.location,
                problem: report.problem,
                description: report.description,
                latitude: report.latitude,
                longitude: report.longitude,
                distanceFromRoute: Number(distance.toFixed(2))
            });
        }
    }

    const issueCounts = {};

    nearbyReports.forEach(report => {

        if (!issueCounts[report.problem]) {
            issueCounts[report.problem] = 0;
        }

        issueCounts[report.problem]++;
    });

    return {
        nearbyReports,
        issueCounts
    };
}

app.post("/reports", async (req, res) => {

    try {

        const {
            location,
            problem,
            description
        } = req.body;

        if (!location || !problem || !description) {
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }

        const coordinates = await geocode(location);

        const newReport = new Report({
            location,
            problem,
            description,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
        });

        await newReport.save();

        console.log("Report saved:", newReport);

        res.json({
            message: "Report saved successfully"
        });

    } catch (error) {

        console.log("Error saving report:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

app.get("/reports", async (req, res) => {

    try {

        const reports = await Report.find()
            .sort({ createdAt: -1 });

        res.json(reports);

    } catch (error) {

        console.log("Error fetching reports:", error);

        res.status(500).json({
            message: "Error fetching reports"
        });
    }
});

app.get("/route", async (req, res) => {

    try {

        const {
            start,
            destination
        } = req.query;

        if (!start || !destination) {
            return res.status(400).json({
                message: "Start and destination are required"
            });
        }

        const startLocation = await geocode(start);
        const destinationLocation = await geocode(destination);

        const routeUrl =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${startLocation.longitude},${startLocation.latitude};` +
            `${destinationLocation.longitude},${destinationLocation.latitude}` +
            `?alternatives=true&overview=full&geometries=geojson`;

        const routeResponse = await fetch(routeUrl);

        if (!routeResponse.ok) {
            throw new Error("Routing service failed");
        }

        const routeData = await routeResponse.json();

        if (routeData.code !== "Ok") {
            throw new Error("No route found");
        }

        const reports = await Report.find({
            latitude: { $exists: true },
            longitude: { $exists: true }
        }).lean();

        const routeAnalyses = routeData.routes.map(route => ({
            route,
            reports: []
        }));

        for (const report of reports) {

            let nearestRouteIndex = -1;
            let smallestDistance = Infinity;

            routeAnalyses.forEach((item, index) => {

                const distance = findNearestRouteDistance(
                    report,
                    item.route.geometry
                );

                if (distance < smallestDistance) {
                    smallestDistance = distance;
                    nearestRouteIndex = index;
                }

            });

            if (
                nearestRouteIndex !== -1 &&
                smallestDistance <= REPORT_RADIUS_KM
            ) {
                routeAnalyses[nearestRouteIndex].reports.push(report);
            }
        }

        const routes = [];

        for (let index = 0; index < routeAnalyses.length; index++) {

            const item = routeAnalyses[index];

            const analysis = analyseRoute(
                item.route,
                item.reports
            );

            const roadInfo = await getOSMRoadInfo(
                item.route.geometry
            );

            routes.push({

                name: `Route ${index + 1}`,

                distance: Number(
                    (item.route.distance / 1000).toFixed(1)
                ),

                duration: Math.round(
                    item.route.duration / 60
                ),

                nearbyReports: analysis.nearbyReports,

                issueCounts: analysis.issueCounts,

                roadInfo,

                geometry: item.route.geometry
            });
        }

        res.json(routes);

    } catch (error) {

        console.log("ROUTE ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
});

app.listen(5000, "127.0.0.1", () => {

    console.log("Server is running on port 5000");

});

console.log("Server file finished");