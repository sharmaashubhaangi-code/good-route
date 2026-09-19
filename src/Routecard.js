function Routecard(props) {

    const routeColor =
        props.index === 0
            ? "#7b4b84"
            : "#c56b8b";

    const roadInfo = props.roadInfo || {};

    return (
        <div className="route-card">

            <div className="route-card-header">

                <h3>
                    <span
                        style={{
                            display: "inline-block",
                            width: "28px",
                            height: "5px",
                            background: routeColor,
                            borderRadius: "10px",
                            marginRight: "8px",
                            verticalAlign: "middle"
                        }}
                    ></span>

                    {props.name}
                </h3>

                <span className="route-badge">
                    {props.index === 0 ? "Route 1" : "Route 2"}
                </span>

            </div>

            <div className="route-info">

                <div>
                    <span className="info-label">
                        Distance
                    </span>

                    <strong>
                        {props.distance}
                    </strong>
                </div>

                <div>
                    <span className="info-label">
                        Estimated time
                    </span>

                    <strong>
                        {props.time}
                    </strong>
                </div>

            </div>

            <div className="condition-box">

                <h4>
                    Mapped road information
                </h4>

                {!roadInfo.dataAvailable ? (

                    <p>
                        No mapped road-condition data available.
                    </p>

                ) : (

                    <>
                        <p>
                            <strong>Surface:</strong>{" "}
                            {roadInfo.surfaces.length > 0
                                ? roadInfo.surfaces.join(", ")
                                : "Not mapped"}
                        </p>

                        <p>
                            <strong>Smoothness:</strong>{" "}
                            {roadInfo.smoothness.length > 0
                                ? roadInfo.smoothness.join(", ")
                                : "Not mapped"}
                        </p>

                        <p>
                            <strong>Lighting:</strong>{" "}
                            {roadInfo.litYes > 0 && roadInfo.litNo > 0
                                ? "Mixed mapped lighting"
                                : roadInfo.litYes > 0
                                    ? "Some lit sections mapped"
                                    : roadInfo.litNo > 0
                                        ? "Some unlit sections mapped"
                                        : "Not mapped"}
                        </p>

                        {roadInfo.unpaved.length > 0 && (
                            <p className="warning-text">
                                ⚠ Unpaved surface mapped
                            </p>
                        )}

                        {roadInfo.rough.length > 0 && (
                            <p className="warning-text">
                                ⚠ Rough road sections mapped
                            </p>
                        )}
                    </>

                )}

            </div>

            <div className="route-problems">

                <h4>
                    Community reports
                </h4>

                {props.nearbyReports.length === 0 ? (

                    <p className="no-problems">
                        ✓ No community reports near this route
                    </p>

                ) : (

                    props.nearbyReports.map(report => (

                        <div
                            className="route-problem"
                            key={report.id}
                        >

                            <strong>
                                {report.problem}
                            </strong>

                            <span>
                                {report.location}
                            </span>

                            <p>
                                {report.description}
                            </p>

                        </div>

                    ))

                )}

            </div>

        </div>
    );
}

export default Routecard;