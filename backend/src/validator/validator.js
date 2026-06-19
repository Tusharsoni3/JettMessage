import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Invalid email").nonempty("Email is required"),
  keyA: z.string().nonempty("Auth key is required"),
  publicKey: z.string().nonempty("Public key is required"),
  encryptedBackupBundle: z.object({
    ciphertext: z.string().nonempty("Backup ciphertext is required"),
    iv: z.string().nonempty("Backup IV is required"),
  }),
});

export const loginSchema = z.object({
  email: z.email("Invalid email").nonempty("Email is required"),
  keyA: z.string().nonempty("Auth key is required"),
});

export const conversationSchema = z.object({
  recipientId: z.string().uuid("Recipient id must be a valid UUID"),
});

export const messageSchema = z.object({
  conversationId: z.string().uuid("Conversation id must be a valid UUID"),
  receiverCiphertext: z.string().nonempty("Receiver ciphertext is required"),
  receiverIv: z.string().nonempty("Receiver IV is required"),
  senderCiphertext: z.string().nonempty("Sender ciphertext is required"),
  senderIv: z.string().nonempty("Sender IV is required"),
});

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      errors: error.flatten().fieldErrors,
    });
  }
};
