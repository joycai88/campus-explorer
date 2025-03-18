// frontend/my-frontend-app/src/components/Echo.jsx
import { useState } from 'react';
import axios from 'axios';

function Echo() {
	const [message, setMessage] = useState('');
	const [echoResponse, setEchoResponse] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!message.trim()) {
			setError('Please enter a message');
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Call the echo endpoint
			const response = await axios.get(`http://localhost:4321/echo/${message}`);
			setEchoResponse(response.data.result);
		} catch (err) {
			setError('Error getting echo response');
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="echo-container">
			<h2>For Testing Purposes</h2>
			<form onSubmit={handleSubmit}>
				<div>
					<label htmlFor="message">Enter a message:</label>
					<input
						type="text"
						id="message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Type something..."
						required
					/>
				</div>

				<button type="submit" disabled={loading}>
					{loading ? 'Sending...' : 'Echo'}
				</button>

				{error && <p className="error">{error}</p>}
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
