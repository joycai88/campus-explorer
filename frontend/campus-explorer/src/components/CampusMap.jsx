import React, { useState, useEffect } from 'react';
import {APIProvider, Map, AdvancedMarker, InfoWindow, Pin} from '@vis.gl/react-google-maps';

const containerStyle = {
	width: '100%',
	height: '500px',
};

const center = {
	lat: 49.2606,
	lng: -123.2460, // UBC coordinates
};

const apiKey = process.env.REACT_APP_API_KEY;

function CampusMap({ datasets, buildingsResponse }) {
	const [buildings, setBuildings] = useState([]);
	const [selectedBuilding, setSelectedBuilding] = useState(null);

	useEffect(() => {
		if (datasets.length > 0 && buildingsResponse.length > 0) {
			const roomDataset = datasets.find(
				(dataset) => dataset.kind === 'rooms'
			);

			if (!roomDataset) {
				console.error('rooms dataset not found');
				return;
			}

			const datasetId = roomDataset.id;

			const uniqueBuildings = [];
			const seenBuildings = new Set();

			buildingsResponse.forEach((building) => {
				const shortname = building[`${datasetId}_shortname`];

				// Ensure unique buildings
				if (!seenBuildings.has(shortname)) {
					seenBuildings.add(shortname);
					uniqueBuildings.push({
						id: shortname,
						shortname: shortname,
						fullname: building[`${datasetId}_fullname`],
						address: building[`${datasetId}_address`],
						seats: building[`${datasetId}_seats`],
						number: building[`${datasetId}_number`],
						position: {
							lat: building[`${datasetId}_lat`],
							lng: building[`${datasetId}_lon`],
						},
					});
				}
			});

			setBuildings(uniqueBuildings);
		}
	}, [datasets, buildingsResponse]);

	const handleMarkerClick = (building) => {
		setSelectedBuilding(building);
	};

	const handleInfoWindowClose = () => {
		setSelectedBuilding(null);
	};

	return (
		<div className="campus-map-container">
			<APIProvider apiKey={apiKey}>
				<Map
					mapId={'DEMO_MAP_ID'}
					defaultZoom={15}
					defaultCenter={center}
					style={containerStyle}
				>
					{buildings.map((building) => (
						<AdvancedMarker
							key={building.id}
							position={building.position}
							title={building.fullname}
							onClick={() => handleMarkerClick(building)}>
							<Pin background={'#b591d0'} glyphColor={'#000'} borderColor={'#000'} />
						</AdvancedMarker>
					))}

					{selectedBuilding && (
						<InfoWindow
							position={selectedBuilding.position}
							onCloseClick={handleInfoWindowClose}
						>
							<div className="info-window">
								<h3>
									{selectedBuilding.fullname} ({selectedBuilding.shortname})
								</h3>
								<p>{selectedBuilding.address}</p>
								<h4>More Information:</h4>
								<p>Room Number: {selectedBuilding.number}</p>
								<p>Seats: {selectedBuilding.seats}</p>
							</div>
						</InfoWindow>
					)}
				</Map>
			</APIProvider>
		</div>
	);
}

export default CampusMap;
