import api from "../services/api";
import {useState} from "react";

function AddDataset() {
	const [id, setId] = useState('');
	const [kind, setKind] = useState('');
	const [content, setContent] = useState(null);
	const [result, setResult] = useState([]);

	const changeField = (e) => {
		setContent(e.target.files[0]);
	};

	const addDataset = async(e) => {
		e.preventDefault();
		try {
			const response = await api.addDataset(id, content, kind);
			setResult(response);
		} catch (error) {
			// do something with error
		}
	}

	return (
		<div className="addDataset-container">
			<h2>Add a Dataset</h2>
			<form onSubmit={addDataset}>
				<div>
					<label htmlFor="id">ID</label>
					<input
						type="text"
						id="id"
						value={id}
						onChange={(e) => setId(e.target.value)}
						required
					/>
				</div>

				<div>
					<label htmlFor="kind">Kind</label>
					<input
						type="text"
						id="kind"
						value={kind}
						onChange={(e) => setKind(e.target.value)}
						required
					/>
				</div>

				<div>
					<label>ZIP File</label>
					<input
						type="file"
						id="content"
						onChange={changeField}
					/>
				</div>

				{content && <p>Selected File: {content.name}</p>}

				<button type="submit">
					Submit
				</button>
			</form>

			{result && (
				<div className="result-response">
					<h3>Current Datasets:</h3>
					{result.map((dataset, index) => (
						<p key={index}>ID: {dataset}</p>
					))}
				</div>
			)}
		</div>
	);
}

export default AddDataset;
