import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <section className="flex min-h-dvh w-full items-center justify-center p-4">
            <div className="flex w-full max-w-md items-center justify-center">
                {children}
            </div>
        </section>
    );
};

export default AuthLayout;
