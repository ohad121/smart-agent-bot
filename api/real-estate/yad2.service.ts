import axios, { AxiosInstance, AxiosResponse } from 'axios';

export { Yad2RealEstateService };
export type { RealEstateItem };

type TextObject = {
	text: string;
};

type Coordinates = {
	lon: number;
	lat: number;
};

type Address = {
	city: TextObject;
	neighborhood: TextObject;
	street: TextObject;
	coords: Coordinates;
	house?: {
		number?: number;
		floor: number;
	};
};

type Property = {
	text: string;
};

type MetaData = {
	coverImage: string;
};

type RealEstateItem = {
	address: Address;
	adType: string;
	orderId: number;
	price: number;
	priority: number;
	subcategoryId: number;
	token: string;
	additionalDetails: {
		property: Property;
		roomsCount: number;
		squareMeter: number;
	};
	metaData: MetaData;
};

type Yad2RealEstateResponse = {
	data: {
		markers: RealEstateItem[];
	};
};

// Yad2 Real Estate Service
class Yad2RealEstateService {
	private axiosInstance: AxiosInstance;

	constructor() {
		this.axiosInstance = axios.create({
			headers: {
				accept: 'application/json, text/plain, */*',
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'same-site',
				Referer: 'https://www.yad2.co.il/',
				'Referrer-Policy': 'strict-origin-when-cross-origin',
			},
		});
	}

	async fetchRealEstateData(
		apiUrl: string // Updated to receive the API URL directly
	): Promise<RealEstateItem[]> {
		try {
			const response: AxiosResponse<Yad2RealEstateResponse> =
				await this.axiosInstance.get(apiUrl);
			return response.data.data.markers;
		} catch (error) {
			return this.handleError(error);
		}
	}

	private handleError(error: any): never {
		console.error('Error fetching real estate data:', error);
		throw new Error(`Failed to fetch real estate data: ${error.message}`);
	}
}
