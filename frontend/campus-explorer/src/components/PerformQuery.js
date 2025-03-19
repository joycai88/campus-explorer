import api from "../services/api";
import {useState} from "react";

function PerformQuery() {
	const [query, setQuery] = useState('');
	const [result, setResult] = useState([]);

	const performQuery = async(e) => {
		e.preventDefault();
		try {
			const response = await api.performQuery(query);
			setResult(response);
		} catch (error) {
			// do something with error
		}
	}
	return (
		<div className="performQuery-container">
			<h2>Perform a Query</h2>
			<form onSubmit={performQuery}>
				<div>
					<label htmlFor="query">Query</label>
					<textarea
						id="query"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						rows="20"
						cols="50"
						required
					/>
				</div>

				<button type="submit">
					Submit
				</button>
			</form>

			<ul>
				{result.map((dataset, index) => (
					<li key={index}>{JSON.stringify(dataset)}</li>
				))}
			</ul>
		</div>
	);
}

export default PerformQuery;
