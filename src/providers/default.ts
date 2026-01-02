export interface provider {
	call(message: string,
		model: string,
		temperature: number
	): Promise<string>
}


