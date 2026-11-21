import { useState, type FormEvent } from "react";
import { NotificacionFlotante, NotificacionesGlobales, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useInicioSesion } from "../../hooks/use-inicio-sesion";

function IconoUsuario() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-1.5a7 7 0 0 1 14 0V20z" /></svg>;
}

function IconoCandado() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>;
}

function IconoOjo({ oculto }: { oculto: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{oculto
    ? <><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.6 4.9 9.5 6.5a1 1 0 0 1 0 1 15 15 0 0 1-3.1 3.8M6.2 6.2a16 16 0 0 0-3.7 5.3 1 1 0 0 0 0 1C3.4 14.1 6.8 19 12 19c1.1 0 2.1-.2 3-.6" /></>
    : <><path d="M2.5 12s3.4-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>}
  </svg>;
}

const estilosLogin = {
  layout: `relative flex min-h-screen items-center justify-start overflow-hidden p-[clamp(24px,5vw,76px)]
    bg-[#061a38] bg-[linear-gradient(90deg,rgb(4_20_45/.38)_0%,rgb(4_20_45/.13)_43%,rgb(4_20_45/.03)_76%),linear-gradient(0deg,rgb(3_15_32/.24),transparent_38%),url('/fondo-login.webp')] bg-center bg-cover bg-no-repeat
    laptop:py-[clamp(24px,5vw,76px)] laptop:px-[clamp(24px,5vw,76px)]
    tablet-landscape:py-[34px] tablet-landscape:px-[34px] tablet-landscape:bg-[linear-gradient(90deg,rgb(4_20_45/.38)_0%,rgb(4_20_45/.13)_43%,rgb(4_20_45/.03)_76%),linear-gradient(0deg,rgb(3_15_32/.24),transparent_38%),url('/fondo-login.webp')] tablet-landscape:bg-[position:center,center,58%_center]
    tablet-portrait:py-[34px] tablet-portrait:px-[34px] tablet-portrait:bg-[linear-gradient(90deg,rgb(4_20_45/.38)_0%,rgb(4_20_45/.13)_43%,rgb(4_20_45/.03)_76%),linear-gradient(0deg,rgb(3_15_32/.24),transparent_38%),url('/fondo-login.webp')] tablet-portrait:bg-[position:center,center,58%_center]
    mobile-landscape:flex mobile-landscape:h-[100dvh] mobile-landscape:min-h-0 mobile-landscape:items-center mobile-landscape:justify-center mobile-landscape:overflow-hidden mobile-landscape:bg-[radial-gradient(ellipse_at_12%_4%,rgb(39_123_209/.34),transparent_42%),radial-gradient(ellipse_at_100%_100%,rgb(17_82_148/.34),transparent_40%),linear-gradient(145deg,#0a3770_0%,#082956_47%,#04172f_100%)] mobile-landscape:p-3
    mobile-portrait:flex mobile-portrait:h-[100dvh] mobile-portrait:min-h-0 mobile-portrait:items-center mobile-portrait:justify-center mobile-portrait:overflow-hidden mobile-portrait:bg-[radial-gradient(ellipse_at_12%_4%,rgb(39_123_209/.34),transparent_42%),radial-gradient(ellipse_at_100%_100%,rgb(17_82_148/.34),transparent_40%),linear-gradient(145deg,#0a3770_0%,#082956_47%,#04172f_100%)] mobile-portrait:p-3
    mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:h-auto mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:min-h-[100dvh] mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:items-start mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:overflow-x-hidden mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:overflow-y-auto` ,
  panel: `relative z-[1] flex w-[min(440px,calc(100vw-48px))] min-h-0 shrink-0 flex-col items-stretch justify-start overflow-hidden rounded-[21px] border border-[rgb(221_238_255/.38)] bg-[linear-gradient(145deg,rgb(44_103_163/.43),rgb(5_23_49/.34))] px-[38px] pt-7 pb-[18px] shadow-[0_30px_84px_rgb(0_9_25/.38),inset_0_1px_0_rgb(255_255_255/.26),inset_0_-1px_0_rgb(129_190_245/.13)] backdrop-blur-[32px] backdrop-saturate-150
    laptop:ml-[clamp(0px,1.2vw,20px)]
    tablet-landscape:ml-0 tablet-landscape:w-[min(420px,53vw)] tablet-landscape:px-8
    tablet-portrait:ml-0 tablet-portrait:w-[min(420px,53vw)] tablet-portrait:px-8
    mobile-landscape:mx-auto mobile-landscape:w-[min(100%,470px)] mobile-landscape:max-h-full mobile-landscape:rounded-[20px] mobile-landscape:border-[rgb(221_238_255/.32)] mobile-landscape:bg-[linear-gradient(145deg,rgb(44_103_163/.43),rgb(5_23_49/.36))] mobile-landscape:px-[clamp(20px,6vw,30px)] mobile-landscape:pt-3 mobile-landscape:pb-2 mobile-landscape:shadow-[0_28px_72px_rgb(0_9_25/.42),inset_0_1px_0_rgb(255_255_255/.18)] mobile-landscape:backdrop-blur-[28px] mobile-landscape:backdrop-saturate-[145%]
    mobile-portrait:mx-auto mobile-portrait:w-[min(100%,470px)] mobile-portrait:max-h-full mobile-portrait:rounded-[20px] mobile-portrait:border-[rgb(221_238_255/.32)] mobile-portrait:bg-[linear-gradient(145deg,rgb(44_103_163/.43),rgb(5_23_49/.36))] mobile-portrait:px-[clamp(20px,6vw,30px)] mobile-portrait:pt-4 mobile-portrait:pb-3 mobile-portrait:shadow-[0_28px_72px_rgb(0_9_25/.42),inset_0_1px_0_rgb(255_255_255/.18)] mobile-portrait:backdrop-blur-[28px] mobile-portrait:backdrop-saturate-[145%]
    mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:max-h-none mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:overflow-visible mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:backdrop-blur-[14px] mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:backdrop-saturate-[125%]
    before:absolute before:top-0 before:left-[38px] before:h-[3px] before:w-[92px] before:rounded-b-[4px] before:bg-[linear-gradient(90deg,#ec2638_0_42%,#5eb6ff_42%_100%)] before:content-[''] mobile-landscape:before:left-7 mobile-portrait:before:left-7` ,
  mobileLogo: `hidden mobile-landscape:mx-auto mobile-landscape:mb-[6px] mobile-landscape:block mobile-landscape:w-[min(112px,24svh,35vw)] mobile-landscape:aspect-square mobile-landscape:object-contain mobile-landscape:drop-shadow-[0_10px_18px_rgb(0_9_25/.32)] mobile-portrait:mx-auto mobile-portrait:mb-[10px] mobile-portrait:block mobile-portrait:w-[min(160px,32svh,44vw)] mobile-portrait:aspect-square mobile-portrait:object-contain mobile-portrait:drop-shadow-[0_10px_18px_rgb(0_9_25/.32)] mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:w-[min(112px,21svh,32vw)] mobile-portrait:[@media(max-width:760px)_and_(max-height:560px)]:mb-[6px]` ,
  content: "m-0 w-full pb-[22px] laptop:p-0 tablet-landscape:p-0 tablet-portrait:p-0 mobile-landscape:pb-2 mobile-portrait:pb-[10px]",
  title: "m-0 text-[34px] font-extrabold tracking-[-.045em] text-[#f7faff] mobile-landscape:text-[clamp(27px,8vw,32px)] mobile-portrait:text-[clamp(27px,8vw,32px)]",
  intro: "mt-1.5 mb-[25px] text-sm text-[#c3d2e4] mobile-landscape:mt-1 mobile-landscape:mb-[10px] mobile-portrait:mt-1 mobile-portrait:mb-[14px]",
  form: "flex flex-col",
  label: "mb-[9px] text-xs font-bold text-[#e5edf7]",
  iconField: "relative flex items-center [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:left-4 [&>svg]:z-[1] [&>svg]:h-[21px] [&>svg]:w-[21px] [&>svg]:fill-none [&>svg]:stroke-[#a9c6e5] [&>svg]:stroke-[1.7] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]",
  input: `h-[49px] w-full rounded-[9px] border border-[rgb(191_214_240/.28)] bg-[rgb(4_19_42/.58)] py-0 pl-[52px] pr-4 text-sm text-[#f5f8fd] shadow-[inset_0_1px_2px_rgb(0_0_0/.12)] outline-none transition-[border-color,box-shadow] duration-[180ms] placeholder:text-[#9db0c7] focus:border-[#7bb8f1] focus:shadow-[0_0_0_3px_rgb(90_168_239/.2)] focus:outline-none
    tablet-landscape:h-[49px] tablet-landscape:rounded-[9px] tablet-landscape:border-[rgb(191_214_240/.25)] tablet-landscape:bg-[rgb(4_19_42/.56)]
    tablet-portrait:h-[49px] tablet-portrait:rounded-[9px] tablet-portrait:border-[rgb(191_214_240/.25)] tablet-portrait:bg-[rgb(4_19_42/.56)]
    mobile-landscape:h-10 mobile-portrait:h-11` ,
  passwordHeading: "mt-5 flex justify-between",
  visibility: "absolute top-1/2 right-3 grid h-[34px] w-[34px] -translate-y-1/2 place-items-center border-0 bg-transparent p-[5px] text-[#aec5df] hover:text-[#ff8995] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[1.7] [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]",
  options: "mt-[15px] mb-5 flex flex-wrap items-center justify-between gap-2.5 mobile-landscape:mt-2 mobile-landscape:mb-[10px] mobile-portrait:mt-[10px] mobile-portrait:mb-[13px]",
  remember: "flex items-center gap-[9px] text-xs text-[#d4e0ee] [&>input]:m-0 [&>input]:h-[18px] [&>input]:w-[18px] [&>input]:accent-[#ed293a]",
  forgot: "p-0 text-xs font-bold text-[#9ed1ff] hover:underline",
  submit: "flex min-h-[50px] items-center justify-center gap-[18px] rounded-[9px] border-0 bg-[linear-gradient(105deg,#cf1e31,#ee3443)] text-[15px] font-bold text-white shadow-[0_9px_20px_rgb(197_31_49/.21)] transition-[background,transform,box-shadow] duration-[180ms] hover:-translate-y-px hover:bg-[linear-gradient(105deg,#b9182a,#dc2939)] hover:shadow-[0_10px_20px_rgb(225_58_69/.23)] disabled:cursor-wait disabled:opacity-75 mobile-landscape:min-h-[42px] mobile-portrait:min-h-[46px]",
  notice: "mt-2 min-h-4 text-xs leading-[1.5] text-[#c4d3e5]",
  footer: "w-full border-t border-[rgb(190_215_241/.17)] pt-[13px] text-left text-[10px] text-[#aabbd0] mobile-landscape:pt-1.5 mobile-landscape:text-[9px] mobile-portrait:pt-2 mobile-portrait:text-[9px]",
};

export function LoginPage() {
  const [mostrarClave, setMostrarClave] = useState(false);
  const alertas = useAlertas();
  const { aviso, setAviso, cargando, accesoConfirmado, iniciar } = useInicioSesion();

  function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    iniciar({ usuario: datos.get("usuario"), contrasena: datos.get("clave"), recordar: datos.get("recordar") === "on" });
  }

  return (
    <main className={estilosLogin.layout}>
      <section className={estilosLogin.panel} aria-labelledby="login-title">
        <img className={estilosLogin.mobileLogo} src="/logo.webp" alt="Logo de Inversiones Maguiña" />
        <div className={estilosLogin.content}>
          <h1 className={estilosLogin.title} id="login-title">Bienvenido</h1>
          <p className={estilosLogin.intro}>Ingresa con tu usuario o correo electrónico.</p>

          <form className={estilosLogin.form} onSubmit={iniciarSesion}>
            <label className={estilosLogin.label} htmlFor="usuario">Usuario o correo electrónico</label>
            <div className={estilosLogin.iconField}>
              <IconoUsuario />
              <input className={estilosLogin.input} id="usuario" name="usuario" type="text" autoComplete="username" placeholder="Ingresa tu usuario o correo" required />
            </div>

            <div className={estilosLogin.passwordHeading}><label className={estilosLogin.label} htmlFor="clave">Contraseña</label></div>
            <div className={estilosLogin.iconField}>
              <IconoCandado />
              <input className={`${estilosLogin.input} pr-[52px]`} id="clave" name="clave" type={mostrarClave ? "text" : "password"} autoComplete="current-password" placeholder="Ingresa tu contraseña" required />
              <button className={estilosLogin.visibility} type="button" aria-label={mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarClave((visible) => !visible)}>
                <IconoOjo oculto={!mostrarClave} />
              </button>
            </div>

            <div className={estilosLogin.options}>
              <label className={estilosLogin.remember}><input type="checkbox" name="recordar" /><span>Recordar mi usuario</span></label>
              <button className={estilosLogin.forgot} type="button" onClick={() => alertas.informacion("Comunícate con el administrador para recuperar el acceso.")}>¿Olvidaste tu contraseña?</button>
            </div>

            <button className={estilosLogin.submit} type="submit" disabled={cargando}>
              {cargando ? "Ingresando..." : "Iniciar sesión"}<span aria-hidden="true">→</span>
            </button>
            <NotificacionFlotante mensaje={aviso} onCerrar={() => setAviso("")} />
          </form>
        </div>

        <footer className={estilosLogin.footer}>© 2026 Inversiones Maguiña. Todos los derechos reservados.</footer>
      </section>

      <NotificacionesGlobales />
      {accesoConfirmado && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-[#07192eb8] p-5 backdrop-blur-[5px] motion-safe:animate-[login-overlay-enter_180ms_ease-out_both]" role="status" aria-live="polite">
          <div className="relative grid w-[min(100%,360px)] justify-items-center rounded-[18px] border border-[#ffffffd9] bg-white px-[30px] pt-[34px] pb-7 text-center shadow-[0_24px_80px_#06172b55] motion-safe:animate-[login-card-enter_240ms_ease-out_both]">
            <span className="mb-[18px] block h-[58px] w-[58px] rounded-full border-4 border-[rgb(93_161_223/.22)] border-t-[#ed293a] border-r-[#5eb6ff] shadow-[0_0_0_6px_rgb(94_182_255/.08)] motion-safe:animate-[login-validation-spin_900ms_linear_infinite] motion-reduce:animate-[login-validation-spin_1.1s_linear_1]" aria-hidden="true" />
            <h2 className="m-0 text-xl font-bold text-[#102d4f]">Validando datos</h2>
            <p className="mt-2 max-w-[280px] text-[13px] leading-[1.55] text-[#62758b]">Estamos preparando los datos iniciales del resumen…</p>
          </div>
        </div>
      )}
    </main>
  );
}
