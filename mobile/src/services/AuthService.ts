import { mockUser } from "@/mock/user";

export class AuthService{

    static async login(

        email:string,

        password:string

    ){

        if(

            email==="admin@climatizacionrg.cl"

            &&

            password==="123456"

        ){

            return mockUser;

        }

        throw new Error("Correo o contraseña incorrectos");

    }

}