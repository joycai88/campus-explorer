import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';

const containerStyle = {
	width: '100%',
	height: '500px'
};

const center = {
	lat: 49.2606,
	lng: -123.2460 // UBC coordinates
};

const apiKey = "REMOVED";

function CampusMap() {
	const [buildings, setBuildings] = useState([]);
	const [selectedBuilding, setSelectedBuilding] = useState(null);
	const [isLoaded, setIsLoaded] = useState(false);

	const fetchBuildings = useCallback(async () => {
		try {
			const datasetsResponse = await fetch('http://localhost:4321/datasets');
			const datasetsData = await datasetsResponse.json();

			const roomsDatasets = datasetsData.result.filter(dataset =>
				dataset.kind === 'rooms'
			);

			if (roomsDatasets.length > 0) {
				const buildingsResponse = await fetch('http://localhost:4321/query', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						WHERE: {},
						OPTIONS: {
							COLUMNS: [
								"rooms_shortname",
								"rooms_fullname",
								"rooms_address",
								"rooms_lat",
								"rooms_lon"
							]
						}
					})
				});

				const buildingsData = await buildingsResponse.json();

				const buildingMap = new Map();

				buildingsData.result.forEach(building => {
					const shortname = building.rooms_shortname;

					if (!buildingMap.has(shortname)) {
						buildingMap.set(shortname, {
							id: shortname,
							shortname: shortname,
							fullname: building.rooms_fullname,
							address: building.rooms_address,
							position: {
								lat: building.rooms_lat,
								lng: building.rooms_lon
							}
						});
					}
				});

				setBuildings(Array.from(buildingMap.values()));
			}
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
			<button
				onClick={handleRefreshMap}
				className="refresh-button"
			>
				Refresh Map
			</button>

			<APIProvider apiKey={apiKey} onLoad={() => setIsLoaded(true)}>
				<Map
					defaultZoom={15}
					defaultCenter={center}
					style={containerStyle}
				>
					{isLoaded && buildings.map(building => (
						<AdvancedMarker
							key={building.id}
							position={building.position}
							title={building.fullname}
							onClick={() => handleMarkerClick(building)}
						/>
					))}

					{selectedBuilding && (
						<InfoWindow
							position={selectedBuilding.position}
							onCloseClick={handleInfoWindowClose}
						>
							<div className="info-window">
								<h3>{selectedBuilding.fullname} ({selectedBuilding.shortname})</h3>
								<p>{selectedBuilding.address}</p>
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
