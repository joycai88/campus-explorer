import React, { useState, useEffect } from 'react';
import api from "../services/api";
import '../index.css';

function RoomInsights({ datasets, buildingsResponse }) {
	const [rooms, setRooms] = useState([]);
	const [selectedRooms, setSelectedRooms] = useState([]);
	// const [roomRelationships, setRoomRelationships] = useState([]);

	useEffect(() => {
		let roomDataset;
		if (datasets.length > 0 && buildingsResponse.length > 0) {
			roomDataset = datasets.find(
				(dataset) => dataset.kind === 'rooms'
			);
		}

		if (!roomDataset) {
			console.error('rooms dataset not found');
			return;
		}

		const datasetId = roomDataset.id;

		const formattedRooms = buildingsResponse.map((room) => ({
			id: room[`${datasetId}_name`],
			shortname: room[`${datasetId}_shortname`],
			fullname: room[`${datasetId}_fullname`],
			address: room[`${datasetId}_address`],
			seats: room[`${datasetId}_seats`],
			number: room[`${datasetId}_number`],
			type: room[`${datasetId}_type`],
			furniture: room[`${datasetId}_furniture`],
			href: room[`${datasetId}_href`],
			position: {
				lat: room[`${datasetId}_lat`],
				lng: room[`${datasetId}_lon`],
			},
		}));

		setRooms(formattedRooms);
	}, [datasets, buildingsResponse]);


	const handleRoomSelect = (room) => {
		setSelectedRooms(selected => {
			if (selected.some(r => r.id === room.id)) {
				return selected.filter(r => r.id !== room.id);
			}

			return selected.length < 5 ? [...selected, room] : selected;
		});
	};

	const handleClearSelection = () => {
		setSelectedRooms([]);
	};


	return (
		<div className={"room-selection-container"}>
			<div className={"room-selection-grid"}>
				<div className={"rooms-list"}>
					{rooms.map((room) => (
						<div
							key={room.id}
							className={`room-item ${
								selectedRooms.some(r => r.id === room.id)
									? 'selected'
									: ''
							}`}
							onClick={() => handleRoomSelect(room)}
						>
							<h3>{room.shortname} {room.number}</h3>
							<p>Address: {room.address}</p>
						</div>
					))}
				</div>
			</div>

			<div className="selected-rooms">
				<div className="selected-rooms-header">
					<h2>Selected Rooms ({selectedRooms.length}/5)</h2>
					<button
						onClick={handleClearSelection}
						disabled={selectedRooms.length === 0}
					>
						Clear Selection
					</button>
				</div>
				<div className="selected-rooms-list">
					{selectedRooms.map((room) => (
						<div key={room.id} className="selected-room-item">
							<h3>{room.fullname}</h3>
							<p>Short Name: {room.shortname}</p>
							<p>Room Number: {room.number}</p>
							<p>Address: {room.address}</p>
							<p>Seats: {room.seats}</p>
						</div>
					))}
				</div>
			</div>
		</div>




)

}

export default RoomInsights;
