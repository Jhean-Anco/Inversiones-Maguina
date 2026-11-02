import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ControladorAutenticacion } from "./autenticacion.controller";
import { ServicioAutenticacion } from "./autenticacion.service";
import { GuardiaSesion } from "./guardia-sesion";
import { GuardiaPermiso } from "./guardia-permiso";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secreto = process.env.AUTENTICACION_SECRETO;
        if (!secreto || secreto.length < 32) {
          throw new Error("AUTENTICACION_SECRETO debe tener al menos 32 caracteres.");
        }
        return { secret: secreto, signOptions: { expiresIn: validarConfiguracionEntorno().segundosSesion } };
      },
    }),
  ],
  controllers: [ControladorAutenticacion],
  providers: [ServicioAutenticacion, GuardiaSesion, GuardiaPermiso],
  exports: [GuardiaSesion, GuardiaPermiso, JwtModule],
})
export class ModuloAutenticacion {}
