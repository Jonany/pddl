export interface Opml {
	version: string
	head: Head
	body: Body
}

export interface Head {
	title: string
	date_created: string
	date_modified: string
}

export interface Body {
	outlines: Outline[]
}

export interface Outline {
	text: string
	type: string
	xml_url: string
	html_url: string
}
