import './App.css';
import Echo from './components/echo';
import ListDatasets from './components/ListDatasets';
import AddDataset from "./components/AddDataset";
import RemoveDataset from "./components/RemoveDataset";
import PerformQuery from "./components/PerformQuery";
import CampusMap from "./components/CampusMap";


function App() {

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
						<CampusMap />
					</section>
					<section>
						<Echo />
					</section>
					<section>
						<ListDatasets />
					</section>
					<section>
						<AddDataset />
					</section>
					<section>
						<RemoveDataset />
					</section>
					<section>
						<PerformQuery />
					</section>
				</div>
			</main>
		</div>
	);
}

export default App;
