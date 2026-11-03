import { Request, Response, NextFunction } from "express";

export const isLogged = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).session?.user;

  if (!user) return res.status(401).json({ message: "Non authentifié." });

  next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).session?.user;

  if (!user)
    return res
      .status(401)
      .json({ message: "Non authentifié : Veuillez vous connecter." });

  if (user.role !== "admin")
    return res
      .status(403)
      .json({ message: "Accès refusé : Droits administrateur requis." });

  next();
};

export const isEmploye = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req.session as any).user;

  if (!user)
    return res
      .status(401)
      .json({ message: "Non authentifié : Veuillez vous connecter." });

  if (user.role !== "employe" && user.role !== "admin")
    return res
      .status(403)
      .json({ message: "Accès refusé : Droits employé requis." });

  (req as any).user = user;
  next();
};

export const isPreparateur = isEmploye;
