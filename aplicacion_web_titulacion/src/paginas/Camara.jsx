import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

export const Camara = () => {
  const [streamActivo, setStreamActivo] = useState(false);
  const [servoCam, setServoCam] = useState({ h: 90, v: 45 });
  const [servoPanel, setServoPanel] = useState({ h: 90, v: 45 });
  const [modoManualCam, setModoManualCam] = useState(false);
  const [modoManualPanel, setModoManualPanel] = useState(false);
  const [resCamH, setResCamH] = useState(5);
  const [resCamV, setResCamV] = useState(5);
  const [resPanelH, setResPanelH] = useState(5);
  const [resPanelV, setResPanelV] = useState(5);

  const urlNgrok = 'https://2071-157-100-141-154.ngrok-free.app';

  const enviarComando = async (target, comando) => {
    const payload = `${target === 'camara' ? 'cam' : 'panel'}:${comando}`;
    await setDoc(doc(db, 'control', 'servos'), {
      mensaje: payload,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  };

  const formatearComando = (h, v) => {
    const pad = (n, size) => n.toString().padStart(size, '0');
    return `T${pad(h, 3)}${pad(v, 3)}`;
  };

  const ControlBox = ({ label, target, modoManual, setModoManual, resH, setResH, resV, setResV }) => {
    const [highlight, setHighlight] = useState('');

    const servo = target === 'camara' ? servoCam : servoPanel;
    const setServo = target === 'camara' ? setServoCam : setServoPanel;

    const mover = (eje, dir) => {
      if (!modoManual) return;

      const paso = eje === 'h' ? resH : resV;
      const limite = eje === 'h' ? 180 : 90;
      const direccion = dir === 'mas' ? 1 : -1;
      const nuevoValor = Math.max(0, Math.min(limite, servo[eje] + direccion * paso));

      const nuevo = { ...servo, [eje]: nuevoValor };
      setServo(nuevo);
      const comando = formatearComando(nuevo.h, nuevo.v);
      enviarComando(target, comando);
    };

    const activarManual = () => {
      const comando = formatearComando(90, 45);
      setServo({ h: 90, v: 45 });
      enviarComando(target, comando);
      setModoManual(true);
    };

    const desactivarManual = () => {
      const payload = `${target === 'camara' ? 'cam' : 'panel'}:F`;
      setModoManual(false);
      setDoc(doc(db, 'control', 'servos'), {
        mensaje: payload,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    };

    const handleKey = (e) => {
      if (!modoManual) return;

      if (target === 'camara') {
        if (e.key === 'w') { mover('v', 'menos'); setHighlight('up'); }
        if (e.key === 's') { mover('v', 'mas'); setHighlight('down'); }
        if (e.key === 'a') { mover('h', 'mas'); setHighlight('left'); }
        if (e.key === 'd') { mover('h', 'menos'); setHighlight('right'); }
      } else {
        if (e.key === '8') { mover('v', 'menos'); setHighlight('up'); }
        if (e.key === '5') { mover('v', 'mas'); setHighlight('down'); }
        if (e.key === '4') { mover('h', 'mas'); setHighlight('left'); }
        if (e.key === '6') { mover('h', 'menos'); setHighlight('right'); }
      }
      setTimeout(() => setHighlight(''), 150);
    };

    useEffect(() => {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    });

    const ControlButton = ({ onClick, Icon, name }) => (
      <button
        onClick={() => { onClick(); setHighlight(name); setTimeout(() => setHighlight(''), 150); }}
        className={`w-12 h-12 flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white rounded-full shadow transition cursor-pointer ${highlight === name ? 'ring-4 ring-cyan-300' : ''}`}
      >
        <Icon size={20} />
      </button>
    );

    return (
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-cyan-500 shadow-md flex flex-col items-center space-y-4 w-fit">
        <h3 className="text-lg font-semibold text-black dark:text-white">{label}</h3>

        <div className="grid grid-cols-3 grid-rows-3 gap-2">
          <div></div>
          <ControlButton onClick={() => mover('v', 'menos')} Icon={ArrowUp} name="up" />
          <div></div>

          <ControlButton onClick={() => mover('h', 'mas')} Icon={ArrowLeft} name="left" />
          <div className="w-12 h-12" />
          <ControlButton onClick={() => mover('h', 'menos')} Icon={ArrowRight} name="right" />

          <div></div>
          <ControlButton onClick={() => mover('v', 'mas')} Icon={ArrowDown} name="down" />
          <div></div>
        </div>

        <div className="flex flex-col space-y-4 w-full mt-4">
          <div className="text-sm text-black dark:text-white">
            Resolución H: <span className="font-semibold">{resH}</span>
            <input
              type="range"
              min={1}
              max={180}
              value={resH}
              onChange={(e) => setResH(Number(e.target.value))}
              className="w-full mt-1 accent-cyan-500"
            />
          </div>
          <div className="text-sm text-black dark:text-white">
            Resolución V: <span className="font-semibold">{resV}</span>
            <input
              type="range"
              min={1}
              max={90}
              value={resV}
              onChange={(e) => setResV(Number(e.target.value))}
              className="w-full mt-1 accent-cyan-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={modoManual ? desactivarManual : activarManual}
            className={`px-3 py-1 text-white rounded cursor-pointer transition ${modoManual ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {modoManual ? 'Desactivar Manual' : 'Activar Manual'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-8 bg-white dark:bg-zinc-900 min-h-screen transition-colors duration-500">
      <h2 className="text-2xl font-bold text-center text-black dark:text-white">ESP32-CAM en Tiempo Real</h2>

      {!streamActivo ? (
        <div className="w-[640px] h-[480px] bg-gray-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center shadow-lg border border-dashed border-gray-400 dark:border-zinc-500">
          <button
            onClick={() => setStreamActivo(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded shadow cursor-pointer"
          >
            Iniciar Cámara
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
          <ControlBox
            label="Control Cámara"
            target="camara"
            modoManual={modoManualCam}
            setModoManual={setModoManualCam}
            resH={resCamH}
            setResH={setResCamH}
            resV={resCamV}
            setResV={setResCamV}
          />
          <div className="flex flex-col items-center">
            <iframe src={`${urlNgrok}/activar-stream`} style={{ display: 'none' }} />
            <iframe
              src={urlNgrok}
              title="Stream ESP32-CAM"
              className="w-[640px] h-[480px] border-4 border-gray-300 rounded-lg shadow-lg object-fill"
              allow="autoplay"
            />
            <button
              onClick={() => setStreamActivo(false)}
              className="mt-4 px-5 py-2 rounded text-white text-lg bg-red-600 hover:bg-red-700 cursor-pointer"
            >
              Detener cámara
            </button>
          </div>
          <ControlBox
            label="Control Panel Solar"
            target="panel"
            modoManual={modoManualPanel}
            setModoManual={setModoManualPanel}
            resH={resPanelH}
            setResH={setResPanelH}
            resV={resPanelV}
            setResV={setResPanelV}
          />
        </div>
      )}
    </div>
  );
};
