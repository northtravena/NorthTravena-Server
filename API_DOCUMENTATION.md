# North Travena API - Documentation & Flow

This document outlines the complete API flow for the North Travena Server.

**Base URL:** `http://localhost:5000/api/v1`

---

## 1. Public Flow (No Authentication Required)

These APIs are used for initial app loading, registration, login, and browsing the service catalog.

### System Health
- **GET** `/health`
- **Description:** Check if the server is running.

### Authentication
- **POST** `/auth/register`
- **Description:** Register a new user account.
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNo": "03001234567",
    "password": "password123"
  }
  ```

- **POST** `/auth/login`
- **Description:** Login to receive a JWT token.
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Note:** Copy the `token` from the response for all subsequent "User" and "Admin" requests.

### Service Catalog (Public)
- **GET** `/service-types`
- **Description:** Get all available service categories (e.g., Luxury Booking, Family Tours).

- **GET** `/services`
- **Description:** Get all active vehicles in the catalog.
- **Query Params:** `?serviceType=Luxury Booking` (Optional filter)

- **GET** `/services/:id`
- **Description:** Get details for a specific vehicle.

- **GET** `/vehicle-rates`
- **Description:** Get the pricing matrix for different trip types.

---

## 2. User Flow (Requires Bearer Token)

**Header:** `Authorization: Bearer <YOUR_TOKEN>`

### Profile
- **GET** `/auth/me`
- **Description:** Get the currently logged-in user's profile.

- **PATCH** `/users/location`
- **Description:** Update user's live location.
- **Body:**
  ```json
  {
    "lat": 35.9208,
    "lng": 74.3145
  }
  ```

### Trip Bookings (Map Flow)
- **POST** `/bookings`
- **Description:** Create a new route-based booking.
- **Body:**
  ```json
  {
    "source": "Danyore, Gilgit",
    "destination": "Jutiyal, Gilgit",
    "sourceLocation": { "lat": 35.9208, "lng": 74.3145 },
    "destinationLocation": { "lat": 35.8884, "lng": 74.3130 },
    "pickupDate": "2026-05-01",
    "pickupTime": "10:00 AM",
    "tripType": "oneWay",
    "totalAmount": 1500,
    "totalDistance": 5.5,
    "vehicleLabel": "Standard Car"
  }
  ```

- **GET** `/bookings`
- **Description:** List your own bookings.
- **Query Params:** `?status=Pending` (Optional filter: Pending, Approved, Completed, Canceled)

- **PATCH** `/bookings/:id/cancel`
- **Description:** Cancel a booking (Only if Pending or Approved).

### Service Requests (Daily Flow)
- **POST** `/user-services`
- **Description:** Request a specific service/vehicle from the catalog.
- **Body:**
  ```json
  {
    "serviceName": "Daily Booking",
    "serviceType": "Luxury Booking",
    "vehicleName": "Toyota Prado",
    "amount": 10000,
    "seats": "4",
    "oil": "Petrol"
  }
  ```

- **GET** `/user-services`
- **Description:** List your own service requests.

- **PATCH** `/user-services/:id/cancel`
- **Description:** Cancel a service request (Only if Pending).

### Captain Features
- **GET** `/captains/nearby`
- **Description:** Find nearby active captains.
- **Query Params:** `?lat=35.9208&lng=74.3145&radiusKm=5`

- **PATCH** `/captains/:id/location`
- **Description:** Update route locations (routeFrom/routeTo).
- **Restriction:** User's phone must match the Captain profile phone, or user must be Admin.
- **Body:**
  ```json
  {
    "routeFrom": {
      "address": "New Source",
      "lat": 35.9210,
      "lng": 74.3150
    },
    "routeTo": {
      "address": "New Destination",
      "lat": 35.8890,
      "lng": 74.3140
    }
  }
  ```

- **PATCH** `/captains/:id/live-location`
- **Description:** Update captain's live current location.
- **Restriction:** User's phone must match the Captain profile phone, or user must be Admin.
- **Body:**
  ```json
  {
    "lat": 35.9208,
    "lng": 74.3145
  }
  ```

### Notifications
- **GET** `/notifications`
- **Description:** List your notifications.

- **PATCH** `/notifications/:id/read`
- **Description:** Mark a specific notification as read.

---

## 3. Admin Flow (Requires Admin Bearer Token)

**Restriction:** User must have `role: "admin"` in the database.

### User Management
- **GET** `/admin/users`
- **Description:** List all registered users.
- **Query Params:** `?role=user`, `?q=search_term`

- **GET** `/admin/users/:id`
- **Description:** Get details of a single user.

### Captain Management
- **POST** `/admin/captains`
- **Description:** Register/Add a new Captain.
- **Body:**
  ```json
  {
    "fullName": "Captain Karim",
    "phone": "03009998887",
    "cnic": "12345-1234567-1",
    "licenceNumber": "ABC-123",
    "vehicleType": "car",
    "vehicleModel": "Honda Civic",
    "registrationPlate": "LEC-1234",
    "seatCapacity": 4,
    "routeFrom": { "address": "Source", "lat": 35.1, "lng": 74.1 },
    "routeTo": { "address": "Destination", "lat": 35.2, "lng": 74.2 }
  }
  ```

- **GET** `/admin/captains`
- **Description:** List all captains.
- **Query Params:** `?status=pending`

- **PATCH** `/admin/captains/:id/approve`
- **Description:** Set captain status to `active`.

- **PATCH** `/admin/captains/:id/reject`
- **Description:** Set captain status to `rejected`.

### Booking Management
- **GET** `/admin/bookings`
- **Description:** List all trip bookings across the platform.

- **PATCH** `/admin/bookings/:id`
- **Description:** Update booking status (e.g., Approve, Complete).
- **Body:** `{ "status": "Approved" }`

### Service Catalog Management
- **POST** `/admin/service-types`
- **Description:** Create a new category (e.g., "VIP Transport").
- **Body:** `{ "name": "VIP Transport" }`

- **POST** `/admin/services`
- **Description:** Add a vehicle to the catalog.
- **Body:**
  ```json
  {
    "amount": 5000,
    "vehicleName": "Suzuki Cultus",
    "serviceType": "Standard",
    "seats": "4",
    "status": "active"
  }
  ```

- **PATCH** `/admin/services/:id`
- **Description:** Update vehicle details or status.

- **DELETE** `/admin/services/:id`
- **Description:** Soft-delete (set to `inactive`).

### Pricing Management
- **PUT** `/admin/vehicle-rates/:tripType`
- **Description:** Update rates for a trip type (`one_way`, `round`, `monthly`).
- **Body:**
  ```json
  {
    "rates": {
      "Standard": 100,
      "Luxury": 250
    }
  }
  ```
