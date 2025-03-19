import api from "../services/api";
import {useState} from "react";

function ListDatasets() {
	const [datasets, setDatasets] = useState([]);

	const getDatasets = async() => {
		try {
			const response = await api.listDatasets();
			setDatasets(response);
		} catch (error) {
			// do something with error
		}
	}

	return (
		<div className="listDataset-container">
			<h2>List of Datasets</h2>
			<button onClick={getDatasets}>
				{"Get Datasets"}
			</button>
			<ul>
				{datasets.map((dataset, index) => (
					<li key={index}>ID:{dataset.id}</li>
				))}
			</ul>
		</div>
	);
}

export default ListDatasets;
