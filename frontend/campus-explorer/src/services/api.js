import axios from 'axios';

// Used ChatGPT for help with required components and file structuring

const BASE_URL = 'http://localhost:4321';

const api = {
	addDataset: async(id, content, kind) => {
		let config = {
			method: 'put',
			maxBodyLength: Infinity,
			url: `${BASE_URL}/dataset/${id}/${kind}`,
			headers: {
				'Content-Type': 'application/octet-stream'
			},
			data : content
		};

		try {
			const response = await axios.request(config);
			return response.data.result;
		} catch (error) {
			console.log(error);
			throw error;
		}
	},
	listDatasets: async() => {
		let config = {
			method: 'get',
			maxBodyLength: Infinity,
			url: `${BASE_URL}/datasets`
		};

		try {
			const response = await axios.request(config);
			return response.data.result;
		} catch (error) {
			console.log(error);
			throw error;
		}
	},
	removeDataset: async(id) => {
		let config = {
			method: 'delete',
			maxBodyLength: Infinity,
			url: `http://localhost:4321/dataset/${id}`
		};

		try {
			const response = await axios.request(config);
			return response.data.result;
		} catch (error) {
			console.log(error);
			throw error;
		}
	},
	performQuery: async(query) => {
		let config = {
			method: 'post',
			maxBodyLength: Infinity,
			url: `${BASE_URL}/query`,
			headers: {
				'Content-Type': 'application/json'
			},
			data : query
		};

		try {
			const response = await axios.request(config);
			return response.data.result;
		} catch (error) {
			console.log(error);
			throw error;
		}
	}

};

export default api;
