import bcrypt from "bcryptjs";

const users = [
    {
        name: "Admin",
        email: "tpbookstore2022@gmail.com",
        phone: "0974908401",
        password: bcrypt.hashSync("tpbookstore2022", 10),
        isAdmin: true,
        avatarUrl: "./images/avatar/default.png",
        isVerified: true,
        isDisabled: false
    }
];

export default users;
