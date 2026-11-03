import { getRequiredEnv } from "../utils/env";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma";

passport.use(
  new GoogleStrategy(
    {
      clientID: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      callbackURL: "/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Aucun email Google trouvé"));

        let user = await prisma.user.findFirst({
          where: { OR: [{ googleId: profile.id }, { email }] },
        });

        if (user) {
          const googlePhoto = profile.photos?.[0]?.value;
          const isGooglePhoto = user.profilePicture?.startsWith("https://lh3.googleusercontent.com");        

          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(!user.googleId && { googleId: profile.id }),              
              ...((isGooglePhoto || !user.profilePicture) && { profilePicture: googlePhoto ?? null }),
            },
          });
        } else {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              email,
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              profilePicture: profile.photos?.[0]?.value || null,
              emailVerifiedAt: new Date(),
            },
          });
        }



        return done(null, user ?? undefined);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

export default passport;
