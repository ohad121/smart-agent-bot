import axios from 'axios';
export { Yad2RealEstateService };
// Yad2 Real Estate Service
class Yad2RealEstateService {
    axiosInstance;
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: 'https://gw.yad2.co.il',
            headers: {
                accept: 'application/json, text/plain, */*',
                'accept-language': 'he,en-US;q=0.9,en;q=0.8,he-IL;q=0.7',
                'cache-control': 'no-cache',
                'sec-ch-ua': '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                Referer: 'https://www.yad2.co.il/',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
            },
        });
    }
    async fetchRealEstateData(params) {
        const url = `/realestate-feed/forsale/map`;
        try {
            const response = await this.axiosInstance.get(url, { params });
            return response.data.data.markers;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    handleError(error) {
        console.error('Error fetching real estate data:', error);
        throw new Error(`Failed to fetch real estate data: ${error.message}`);
    }
}
