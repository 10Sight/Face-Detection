import axios from "axios";
import env from "../configs/env.config.js";
import logger from "../loggers/winston.logger.js";

const { whatsappInstanceId, whatsappToken, whatsappNotifyNumber } = env;

/**
 * Service to handle WhatsApp notifications via UltraMsg.
 */
class WhatsappService {
    /**
     * Sends a text message to the preconfigured notification number.
     * @param {string} body - The message content.
     * @param {string} [to] - Optional recipient override.
     */
    async sendMessage(body, to) {
        try {
            if (!whatsappInstanceId || !whatsappToken) {
                logger.warn("[WhatsAppService] Missing credentials, skipping send.");
                return;
            }

            const targetNumber = to || whatsappNotifyNumber;
            const url = `https://api.ultramsg.com/${whatsappInstanceId}/messages/chat`;

            logger.debug(`[WhatsAppService] Sending alert to ${targetNumber}`);

            const response = await axios.post(url, {
                token: whatsappToken,
                to: targetNumber,
                body: body,
                priority: 10
            });

            logger.info(`[WhatsAppService] Message sent: ${response.data.id}`);
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            logger.error(`[WhatsAppService] Send failed: ${errorMsg}`);
        }
    }

    /**
     * Sends an image message.
     */
    async sendImage(imageUrl, caption, to) {
        try {
            if (!whatsappInstanceId || !whatsappToken) {
                logger.warn("[WhatsAppService] Missing credentials, skipping image.");
                return;
            }

            const url = `https://api.ultramsg.com/${whatsappInstanceId}/messages/image`;
            const response = await axios.post(url, {
                token: whatsappToken,
                to: to || whatsappNotifyNumber,
                image: imageUrl,
                caption: caption,
                priority: 10
            });

            logger.info("[WhatsAppService] Image notification sent successfully");
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            logger.error(`[WhatsAppService] Image send failed: ${errorMsg}`);
        }
    }
}

export const whatsappService = new WhatsappService();

