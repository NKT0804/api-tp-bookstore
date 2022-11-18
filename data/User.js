import bcrypt from "bcryptjs";

const users = [
    {
        name: "Admin",
        email: "admin@tpbookstore.com",
        phone: "0123456789",
        password: bcrypt.hashSync("123456", 10),
        isAdmin: true
    },
    {
        name: "User",
        email: "user@tpbookstore.com",
        phone: "0123456789",
        password: bcrypt.hashSync("123456", 10)
    }
];

export default users;
