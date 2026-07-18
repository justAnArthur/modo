export declare const meta: {
    name: string;
    description: string;
    category: "primitives";
};
export declare function Component(props: {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    children?: React.ReactNode;
}): import("react").JSX.Element;
export declare const examples: readonly [{
    readonly name: "Primary";
    readonly props: {
        readonly variant: "primary";
    };
    readonly children: "Save";
}, {
    readonly name: "Secondary";
    readonly props: {
        readonly variant: "secondary";
    };
    readonly children: "Cancel";
}, {
    readonly name: "Ghost";
    readonly props: {
        readonly variant: "ghost";
    };
    readonly children: "Skip";
}, {
    readonly name: "Disabled";
    readonly props: {
        readonly variant: "primary";
        readonly disabled: true;
    };
    readonly children: "Save";
}];
export declare const props: readonly [{
    readonly name: "variant";
    readonly type: "enum";
    readonly values: readonly ["primary", "secondary", "ghost"];
    readonly default: "primary";
}, {
    readonly name: "size";
    readonly type: "enum";
    readonly values: readonly ["sm", "md", "lg"];
    readonly default: "md";
}, {
    readonly name: "disabled";
    readonly type: "boolean";
    readonly default: false;
}];
