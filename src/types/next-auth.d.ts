import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      clientId?: number | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    clientId?: number | null;
    role?: string;
  }
}
