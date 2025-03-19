import { useState } from 'react';
import axios from 'axios';

function Echo() {
	const [message, setMessage] = useState('');
	const [echoResponse, setEchoResponse] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await axios.get(`http://localhost:4321/echo/${message}`);
			setEchoResponse(response.data.result);
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<div className="echo-container">
			<h2>For Testing Server Functionality</h2>
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="message">Write something here:</label>
					<input
						type="text"
						id="message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						required
					/>
				</div>

				<button type="submit">
					{'Test'}
				</button>
			</form>

			{echoResponse && (
				<div className="echo-response">
					<h3>Server Response:</h3>
					<p>{echoResponse}</p>
				</div>
			)}
		</div>
	);
}

export default Echo;
