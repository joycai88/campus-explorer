import axios from 'axios';

const BASE_URL = 'http://localhost:4321';

const api = {
	listDatasets: async() => {
		try {
			const response = await axios.get(`${BASE_URL}/datasets`);
			return response.data.result;
		} catch (error) {
			throw error.response;
		}
	}

};

export default api;
