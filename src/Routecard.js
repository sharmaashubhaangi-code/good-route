function RouteCard(props){
    return (
        <div>
            <h3>
                {props.name}
            </h3>
            <p>Distance: {props.distance}</p>
            <p>Time: {props.time}</p>
            <p>Road quality: {props.quality}</p>
            <p>Night Suitability: {props.night}</p>
        </div>
    );
}
export default RouteCard;