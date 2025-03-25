import {useEffect, useState} from "react";


function DistanceCalculator( { selectedRooms }) {
	const [roomRelationships, setRoomRelationships] = useState([]);

	// CITATION: https://mapsplatform.google.com/resources/blog/how-calculate-distances-map-maps-javascript-api/

	const haversine_distance = (lat1, lng1, lat2, lng2) => {
		const R = 6371e3; // Radius of the Earth in METERS
		const rlat1 = lat1 * (Math.PI/180); // Convert degrees to radians
		const rlat2 = lat2 * (Math.PI/180); // Convert degrees to radians
		const difflat = rlat2-rlat1; // Radian difference (latitudes)
		const difflon = (lng2-lng1) * (Math.PI/180); // Radian difference (longitudes)

		const d = 2 * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
		return d * R; // distance in meters
	}

	// CITATION: Following methods employed help of Claude AI

	const calculateWalkingTime = (distance) => {
		const walkingSpeed = 1.4;
		const timeInMinutes = distance / walkingSpeed / 60;
		return Math.round(timeInMinutes);
	};

	useEffect(() => {
		if (selectedRooms.length > 1) {
			const relationships = [];
			for (let i = 0; i < selectedRooms.length; i++) {
				for (let j = i + 1; j < selectedRooms.length; j++) {
					const room1 = selectedRooms[i];
					const room2 = selectedRooms[j];
					const distance = haversine_distance(
						room1.position.lat,
						room1.position.lng,
						room2.position.lat,
						room2.position.lng
					);

					const walkingTime = calculateWalkingTime(distance);

					relationships.push({
						buildings: [room1, room2],
						distance: distance,
						walkingTime: walkingTime
					});
				}
			}

			setRoomRelationships(relationships);
		} else {
			setRoomRelationships([]);
		}
	}, [selectedRooms]);

	return (
		<div>
		{roomRelationships.length > 0 && (
				<div className="room-relationships">
					{roomRelationships.map((relationship, index) => (
						<div key={index} className="selected-room-item">
							<h3>
								{`${relationship.buildings[0].shortname} ${relationship.buildings[0].number}
								to ${relationship.buildings[1].shortname} ${relationship.buildings[1].number}:`}
							</h3>
							<p>
								Walking Time: {relationship.walkingTime} minutes
							</p>
							<p>
								Distance: {(relationship.distance / 1000).toFixed(2)} km
							</p>
						</div>
					))}
				</div>
		)}
		</div>

	)


}

export default DistanceCalculator
