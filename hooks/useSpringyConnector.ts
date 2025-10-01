import { useState, useEffect, useRef } from 'react';

const STIFFNESS_FACTOR = 0.01;
const DAMPING = 0.85;
const MASS = 10;

interface Point {
  x: number;
  y: number;
}

export const useSpringyConnector = (startPoint: Point, endPoint: Point, tension: number) => {
  const controlPointRef = useRef<Point>({
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  });
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  const [renderPoint, setRenderPoint] = useState<Point>(controlPointRef.current);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const pos = controlPointRef.current;
      const vel = velocityRef.current;
      const stiffness = tension * STIFFNESS_FACTOR;
      
      const idealMidpoint = {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2,
      };

      const force = {
        x: (idealMidpoint.x - pos.x) * stiffness,
        y: (idealMidpoint.y - pos.y) * stiffness,
      };

      const acceleration = {
        x: force.x / MASS,
        y: force.y / MASS,
      };

      vel.x += acceleration.x;
      vel.y += acceleration.y;

      vel.x *= DAMPING;
      vel.y *= DAMPING;

      pos.x += vel.x;
      pos.y += vel.y;
      
      controlPointRef.current = pos;
      velocityRef.current = vel;

      if (Math.hypot(renderPoint.x - pos.x, renderPoint.y - pos.y) > 0.1 || Math.hypot(vel.x, vel.y) > 0.1) {
        setRenderPoint({ ...pos });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [startPoint.x, startPoint.y, endPoint.x, endPoint.y, tension, renderPoint]);

  return renderPoint;
};
