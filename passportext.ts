import { Userinfo } from './app/models/userinfo.model.js';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.ACCESS_TOKEN_SECRET,
};

console.log(options.jwtFromRequest);

passport.use(new JwtStrategy(options, (jwt_payload, done) => {
  Userinfo.findByPk(jwt_payload.sub).then((user: Userinfo | null) => {

    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  }).catch((err: Error) => {
    done(err, false);
  });
}));

export default passport;
