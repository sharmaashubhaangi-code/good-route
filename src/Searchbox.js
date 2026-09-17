import { useState } from 'react';
import Routecard from './Routecard';
function Searchbox(){
    const[message, setMessage]=useState("");
    const[showRoutes, setShowRoutes]=useState(false);
    return (
        <div>
            <h2> Find a better route</h2>
            <input 
            type="text"
            placeholder="Enter starting location"
            />

            <input
            type="text"
            placeholder="Enter destination"
            />
            <button onClick={() => {setMessage("Routes found! Comparing road conditions...");
                setShowRoutes(true);
            }}>
                Find Route
            </button>
            <p>{message}</p>
            {showRoutes && (
                <>
                <h2>Compare roots</h2>
                <Routecard 
                name="Route1" 
                distance="270 km"
                time="4 hours 20min"
                quality="good"
                night="good"
            />
            <p>Why this route?</p>
            <p>Good road condition and suitable for night travel.</p>

            <Routecard
                name="Route2" 
                distance="300 km"
                time="4 hours 05 min"
                quality="poor"
                night="not recommended"
                />

            <p>Why this route?</p>
            <p>Poor road condition and not recommended for night.</p>
            </>
            )}
        </div>
    );
}
export default Searchbox;