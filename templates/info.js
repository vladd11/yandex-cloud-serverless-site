const Info = {
    title: "Shop",
    description: "Water delivery",
    products: [
        {% for product in products %}
        {
            id: "{{ product.uid }}",
            title: "{{ product.title }}",
            category: "{{ product.category }}",
            description: "{{ product.description }}",
            image_uri: "{{ product.image_uri }}",
            price: {{ product.price * 100 }},
        },
        {% endfor %}
    ],
    categories: [
        {% for category in categories %}
        "{{ category }}",
        {% endfor %}
    ]
};

export default Info;
