import api from "../services/api";
import {useState} from "react";

function RemoveDataset() {
	const [id, setId] = useState('');
	const [result, setResult] = useState('');

	const removeDataset = async(e) => {
		e.preventDefault();
		try {
			const response = await api.removeDataset(id);
			setResult(response);
		} catch (error) {
			// do something with error
		}
	}

	return (
		<div className="removeDataset-container">
			<h2>Remove a Dataset</h2>
			<form onSubmit={removeDataset}>
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

				<button type="submit">
					Submit
				</button>
			</form>

			<p>Removed {result}</p>
		</div>
	);
}

export default RemoveDataset;
