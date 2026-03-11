# Downloading node as the base image
FROM node:18.9.1

# Creating a working directory for the application
WORKDIR /app

# Copying the requirements file to the working directory
COPY package.json ./

# Installing all the dependencies
RUN npm install

# Copying the remaining source codes to the working directory
COPY . .

# Exposing the port numnber on which the application will run
EXPOSE 3000

# Starting the application
CMD ["node", "index.js"]