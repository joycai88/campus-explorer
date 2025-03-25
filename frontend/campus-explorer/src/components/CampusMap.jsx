import React, {useState, useEffect, useCallback} from 'react';
import {APIProvider, Map, AdvancedMarker, InfoWindow, Pin} from '@vis.gl/react-google-maps';
import api from "../services/api";

const containerStyle = {
	width: '100%',
	height: '500px',
};

const center = {
	lat: 49.2606,
	lng: -123.2460, // UBC coordinates
};

const apiKey = "REMOVED";

function CampusMap() {
	const [buildings, setBuildings] = useState([]);
	const [selectedBuilding, setSelectedBuilding] = useState(null);
	const [isLoaded, setIsLoaded] = useState(false);

	const fetchBuildings = useCallback(async () => {
		try {
			const datasets = await api.listDatasets();

			const roomDataset = datasets.find(
				(dataset) => dataset.kind === 'rooms'
			);

			if (!roomDataset) {
				console.error('rooms dataset not found');
				return;
			}

			const datasetId = roomDataset.id;
			const buildingsResponse = await api.performQuery(
				JSON.stringify({
					WHERE: {},
					OPTIONS: {
						COLUMNS: [
							`${datasetId}_shortname`,
							`${datasetId}_fullname`,
							`${datasetId}_address`,
							`${datasetId}_seats`,
							`${datasetId}_number`,
							`${datasetId}_lat`,
							`${datasetId}_lon`,
						],
					},
				})
			);

			// console.log(buildingsResponse);

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
		} catch (error) {
			console.error('Error fetching building data:', error);
		}
	}, []);


	useEffect(() => {
		// Initial fetch when component mounts
		fetchBuildings();
		setIsLoaded(true);
	}, [fetchBuildings]);

	const handleMarkerClick = (building) => {
		setSelectedBuilding(building);
	};

	const handleInfoWindowClose = () => {
		setSelectedBuilding(null);
	};

	const handleRefreshMap = () => {
		fetchBuildings();
	};

	return (
		<div className="campus-map-container">
			<button onClick={handleRefreshMap} className="refresh-button">
				Refresh Map
			</button>

			<APIProvider apiKey={apiKey} onLoad={() => setIsLoaded(true)}>
				<Map
					mapId={'DEMO_MAP_ID'}
					defaultZoom={15}
					defaultCenter={center}
					style={containerStyle}
				>
					{isLoaded &&
						buildings.map((building) => (
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
								<h4>
									More Information:
								</h4>
								<p>Room Number: {selectedBuilding.number}</p>
								<p>Seats: {selectedBuilding.seats}</p>
							</div>
						</InfoWindow>
					)}
				</Map>
			</APIProvider>

			{!isLoaded && <div>Loading Map...</div>}
		</div>
	);
}

export default CampusMap;
