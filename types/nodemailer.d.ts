declare module "nodemailer" {
  const nodemailer: any;
  export default nodemailer;
}

declare module "nodemailer-sendgrid" {
  const nodemailerSendgrid: (options: { apiKey: string }) => any;
  export default nodemailerSendgrid;
}
