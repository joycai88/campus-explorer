import './App.css';
import Echo from './components/echo';
import ListDatasets from './components/ListDatasets';
import AddDataset from "./components/AddDataset";
import RemoveDataset from "./components/RemoveDataset";
import PerformQuery from "./components/PerformQuery";
import CampusMap from "./components/CampusMap";
import api from "./services/api";
import {useEffect, useState} from "react";
import RoomInsights from "./components/RoomInsights";


function App() {
	const [datasets, setDatasets] = useState([]);
	const [buildingsResponse, setBuildingsResponse] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const fetchedDatasets = await api.listDatasets();
				setDatasets(fetchedDatasets);

				const roomDataset = fetchedDatasets.find(
					(dataset) => dataset.kind === 'rooms'
				);

				if (!roomDataset) {
					throw new Error('rooms dataset not found');
				}

				const datasetId = roomDataset.id;

				const response = await api.performQuery(
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
								`${datasetId}_name`,
								`${datasetId}_furniture`,
								`${datasetId}_type`,
								`${datasetId}_href`,

							],
						},
					})
				);

				setBuildingsResponse(response);
				setIsLoading(false);
			} catch (err) {
				console.error('Error fetching data:', err);
				setError(err);
				setIsLoading(false);
			}
		};

		fetchData();
	}, []);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error.message}</div>;
	}


	return (

		<div className="App">

			<header>
				<h1>Campus Explorer</h1>
			</header>

			<main>
				<div className="test-func">
					<section>
						<h2>
							Map of UBC Buildings:
						</h2>
						<CampusMap datasets={datasets} buildingsResponse={buildingsResponse}/>
					</section>
					<section>
						<h2>
							Room Insights:
						</h2>
						<RoomInsights datasets={datasets} buildingsResponse={buildingsResponse}/>
					</section>
					<section>
						<Echo/>
					</section>
					<section>
						<ListDatasets/>
					</section>
					<section>
						<AddDataset/>
					</section>
					<section>
						<RemoveDataset/>
					</section>
					<section>
						<PerformQuery/>
					</section>
				</div>
			</main>
		</div>
	);
}

export default App;
